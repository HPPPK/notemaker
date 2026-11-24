"""Serve exactly one bound HTML and atomically save its model back without a picker."""
import argparse
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import re
from pathlib import Path
import secrets
import shutil
import shlex
import tempfile
import threading
import webbrowser

from build_note import build, validate, SKILL

def sha(data):return hashlib.sha256(data).hexdigest()

class NoteServer(ThreadingHTTPServer):
    daemon_threads=True
    def __init__(self,note,port=0):
        self.note=Path(note).resolve(strict=True)
        if self.note.suffix.lower() not in ('.html','.htm'):raise ValueError('Bind an existing HTML file')
        self.token=secrets.token_urlsafe(32)
        self.lock=threading.Lock()
        super().__init__(('127.0.0.1',port),Handler)
        self.origin='http://127.0.0.1:'+str(self.server_port)
        self.base='/'+self.token+'/'
        self.url=self.origin+self.base

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass # Do not record capability URLs or note contents.
    def reply(self,status,data,kind='application/json; charset=utf-8'):
        if not isinstance(data,bytes):data=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer');self.send_header('X-Frame-Options','DENY')
        self.end_headers();self.wfile.write(data)
    def valid_host(self):return self.headers.get('Host')=='127.0.0.1:'+str(self.server.server_port)
    def do_GET(self):
        if not self.valid_host():self.reply(403,{'error':'Unexpected host'});return
        if self.path!=self.server.base:self.reply(404,{'error':'Not found'});return
        data=self.server.note.read_bytes()
        session={'endpoint':self.server.base+'api/save','token':self.server.token,'revision':sha(data),'name':self.server.note.name}
        injection='<script id="notemaker-session" type="application/json">'+json.dumps(session,ensure_ascii=False).replace('<','\\u003c')+'</script>'
        text=data.decode('utf-8').replace('<head>','<head>'+injection,1)
        self.reply(200,text.encode(),'text/html; charset=utf-8')
    def do_OPTIONS(self):self.reply(403,{'error':'Cross-origin requests are not supported'})
    def do_POST(self):
        srv=self.server
        if not self.valid_host() or self.headers.get('Origin')!=srv.origin or self.headers.get('X-Notemaker-Token')!=srv.token:
            self.reply(403,{'error':'Save must originate from the bound local note'});return
        if self.path!=srv.base+'api/save':self.reply(404,{'error':'Not found'});return
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':self.reply(415,{'error':'JSON required'});return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=50*1024*1024:self.reply(413,{'error':'Note request exceeds 50 MiB'});return
            payload=json.loads(self.rfile.read(length));model=validate(payload['model'])
            if not isinstance(payload.get('revision'),str):raise ValueError('Missing revision')
            if re.search(r'src\s*=\s*[\"\x27]asset:',json.dumps(model,ensure_ascii=False).replace('\\"','"'),re.I):
                self.reply(400,{'error':'保存的图片必须已内嵌；请通过插入图片添加，而非引用本地路径。'});return
            rendered=build(model,srv.note.parent).encode('utf-8')
            with srv.lock:
                old=srv.note.read_bytes()
                if sha(old)!=payload['revision']:
                    self.reply(409,{'error':'源文件已被其他窗口或程序修改。当前草稿已保留，请先导出副本再重新打开比较。'});return
                backup_dir=srv.note.parent/'.notemaker-backups'/srv.note.stem
                backup_dir.mkdir(parents=True,exist_ok=True)
                stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
                backup=backup_dir/(stamp+'-'+sha(old)[:12]+'.html')
                backup.write_bytes(old)
                temp_name=None
                try:
                    with tempfile.NamedTemporaryFile(dir=srv.note.parent,prefix='.notemaker-',suffix='.tmp',delete=False) as stream:
                        temp_name=stream.name;stream.write(rendered);stream.flush();os.fsync(stream.fileno())
                    os.chmod(temp_name,srv.note.stat().st_mode)
                    if sha(srv.note.read_bytes())!=payload['revision']:
                        self.reply(409,{'error':'源文件在保存期间发生改变，草稿已保留。'});return
                    os.replace(temp_name,srv.note);temp_name=None
                    revision=sha(srv.note.read_bytes())
                    if revision!=sha(rendered):raise OSError('Saved bytes did not match')
                finally:
                    if temp_name and Path(temp_name).is_file():Path(temp_name).unlink()
            self.reply(200,{'ok':True,'revision':revision,'name':srv.note.name,'backup':backup.name})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:self.reply(400,{'error':'Invalid note model: '+str(exc)})
        except OSError:self.reply(500,{'error':'未能写入源文件；请检查文件权限。当前草稿仍在页面中。'})

def create_launchers(note):
    note=Path(note).resolve(strict=True)
    runtime=note.parent/'_notemaker_runtime'
    for directory in ('assets','scripts'):
        shutil.copytree(SKILL/directory,runtime/directory,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    cmd=note.with_name('打开编辑_'+note.stem+'.cmd')
    name=note.name.replace('%','%%')
    cmd.write_bytes(('@echo off\r\nchcp 65001 >nul\r\nsetlocal DisableDelayedExpansion\r\nset PYTHONIOENCODING=utf-8\r\npython "%~dp0_notemaker_runtime\\scripts\\serve_note.py" "%~dp0'+name+'" %*\r\nif errorlevel 1 pause\r\n').encode('utf-8'))
    command=note.with_name('打开编辑_'+note.stem+'.command')
    command.write_text('#!/bin/bash\nset -e\nNOTE_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"\nexec python3 "$NOTE_DIR/_notemaker_runtime/scripts/serve_note.py" "$NOTE_DIR"/'+shlex.quote(note.name)+' "$@"\n',encoding='utf-8')
    command.chmod(0o755)
    return cmd,command

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('note',type=Path);parser.add_argument('--port',type=int,default=0)
    parser.add_argument('--no-browser',action='store_true');parser.add_argument('--create-launchers',action='store_true')
    args=parser.parse_args()
    if args.create_launchers:
        for path in create_launchers(args.note):print(path)
        return
    server=NoteServer(args.note,args.port)
    print(json.dumps({'url':server.url,'name':server.note.name},ensure_ascii=False),flush=True)
    print('Keep this terminal open. Ctrl+C stops Notemaker.',flush=True)
    if not args.no_browser:webbrowser.open(server.url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
