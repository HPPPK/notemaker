import importlib.util
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.request
import urllib.error

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'skills/notemaker/scripts'))
from serve_note import NoteServer,sha,create_launchers
from build_note import DataExtractor

class AtomicSaveTests(unittest.TestCase):
    @unittest.skipUnless(os.name=='nt','Windows launcher is tested on Windows only')
    def test_windows_launcher_handles_unicode_and_spaces(self):
        with tempfile.TemporaryDirectory(prefix='notemaker-测试-') as directory:
            note=Path(directory)/'课件 测试.html';note.write_bytes((ROOT/'examples/general-note.html').read_bytes())
            launcher,_=create_launchers(note)
            process=subprocess.Popen(['cmd','/d','/c',str(launcher),'--no-browser'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                line=process.stdout.readline().decode('utf-8').strip()
                self.assertTrue(line.startswith('{'),line)
                url=json.loads(line)['url']
                with urllib.request.urlopen(url,timeout=5) as response:self.assertIn(b'notemaker-session',response.read())
            finally:
                subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                process.wait(timeout=5);process.stdout.close();process.stderr.close()
    def test_replace_failure_preserves_original_and_removes_temporary_file(self):
        with tempfile.TemporaryDirectory() as directory:
            note=Path(directory)/'note.html';original=(ROOT/'examples/general-note.html').read_bytes();note.write_bytes(original)
            extractor=DataExtractor();extractor.feed(original.decode());model=json.loads(''.join(extractor.parts))
            server=NoteServer(note);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                request=urllib.request.Request(server.url+'api/save',data=json.dumps({'model':model,'revision':sha(original)}).encode(),headers={'Content-Type':'application/json','Origin':server.origin,'X-Notemaker-Token':server.token},method='POST')
                with patch('serve_note.os.replace',side_effect=PermissionError('test replace failure')):
                    with self.assertRaises(urllib.error.HTTPError) as caught:urllib.request.urlopen(request)
                    self.assertEqual(caught.exception.code,500)
                    caught.exception.close()
                self.assertEqual(note.read_bytes(),original)
                self.assertEqual(list(Path(directory).glob('.notemaker-*.tmp')),[])
                self.assertEqual(len(list((Path(directory)/'.notemaker-backups/note').glob('*.html'))),1)
            finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
