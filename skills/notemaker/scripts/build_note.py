"""Build self-contained Notemaker HTML or extract its canonical editable model."""
import argparse
import base64
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re

SKILL = Path(__file__).resolve().parents[1]
SIGNATURES = [('image/png',lambda b:b.startswith(b'\x89PNG\r\n\x1a\n')),('image/jpeg',lambda b:b.startswith(b'\xff\xd8\xff')),('image/gif',lambda b:b[:6] in (b'GIF87a',b'GIF89a')),('image/webp',lambda b:b[:4]==b'RIFF' and b[8:12]==b'WEBP')]

def image_url(path):
    data=path.read_bytes()
    if len(data)>10*1024*1024:raise ValueError('An image exceeds the 10 MiB embedding limit')
    mime=next((m for m,check in SIGNATURES if check(data)),None)
    if not mime:raise ValueError('Only actual PNG/JPEG/GIF/WebP files can be embedded')
    return 'data:'+mime+';base64,'+base64.b64encode(data).decode('ascii')

def validate(model):
    if model.get('version')!=1:raise ValueError('Expected model version 1')
    for key in ['title','intro','summary']:
        if not isinstance(model.get(key),str) or not model[key].strip():raise ValueError('Required nonempty text: '+key)
    sections=model.get('sections');topics=model.get('topics')
    if not isinstance(sections,list) or not sections or not isinstance(topics,list) or not topics:raise ValueError('Sections and topics must be nonempty lists')
    ids=set()
    for item in sections+topics:
        if not isinstance(item,dict) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_-]*',str(item.get('id',''))):raise ValueError('Invalid section/topic id')
        if item['id'] in ids or item['id']=='home':raise ValueError('Duplicate or reserved id')
        ids.add(item['id'])
        for key in ['title','intro']:
            if not isinstance(item.get(key),str) or not item[key].strip():raise ValueError('Missing '+key+' in '+item['id'])
    section_ids={s['id'] for s in sections}
    for s in sections:
        if not isinstance(s.get('summary'),str) or not s['summary'].strip():raise ValueError('Section summary required')
    source_ids=set()
    for source in model.get('sources',[]):
        if not source.get('id') or source['id'] in source_ids or not isinstance(source.get('label'),str):raise ValueError('Invalid/duplicate source')
        source_ids.add(source['id'])
    for topic in topics:
        if topic.get('section') not in section_ids or not isinstance(topic.get('body'),str) or not topic['body'].strip():raise ValueError('Invalid topic section/body')
        if not isinstance(topic.get('sources',[]),list) or any(s not in source_ids for s in topic.get('sources',[])):raise ValueError('Unknown topic source')
    settings=model.setdefault('settings',{})
    if settings.get('theme','light') not in ['light','dark']:raise ValueError('Unknown theme')
    if settings.get('accent','olive') not in ['olive','blue','plum','terracotta']:raise ValueError('Unknown accent')
    if not .85<=float(settings.get('fontScale',1))<=1.35:raise ValueError('fontScale outside supported range')
    return model

class DataExtractor(HTMLParser):
    def __init__(self):super().__init__();self.active=False;self.parts=[]
    def handle_starttag(self,tag,attrs):
        if tag=='script' and dict(attrs).get('id')=='notemaker-data':self.active=True
    def handle_endtag(self,tag):
        if tag=='script':self.active=False
    def handle_data(self,data):
        if self.active:self.parts.append(data)

def build(model,base):
    validate(model)
    for topic in model['topics']:
        def embed(match):
            return match[1]+image_url((base/html.unescape(match[2])).resolve())+match[3]
        topic['body']=re.sub(r'(src\s*=\s*[\"\x27])asset:([^\"\x27]+)([\"\x27])',embed,topic['body'])
    template=(SKILL/'assets/template.html').read_text(encoding='utf-8')
    data=json.dumps(model,ensure_ascii=False).replace('<','\\u003c')
    values={'TITLE':html.escape(model['title']),'CSS':(SKILL/'assets/styles.css').read_text(encoding='utf-8'),'DATA':data,'JS':(SKILL/'assets/app.js').read_text(encoding='utf-8'),'WIDGETS':(SKILL/'assets/widgets.js').read_text(encoding='utf-8')}
    return re.sub(r'\{\{(TITLE|CSS|DATA|JS|WIDGETS)\}\}',lambda m:values[m[1]],template)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--extract',type=Path)
    args=parser.parse_args()
    if args.extract:
        p=DataExtractor();p.feed(args.source.read_text(encoding='utf-8'));model=validate(json.loads(''.join(p.parts)))
        args.extract.write_text(json.dumps(model,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(args.extract);return
    if not args.output:parser.error('--output is required when building')
    model=json.loads(args.source.read_text(encoding='utf-8-sig'))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(build(model,args.source.resolve().parent),encoding='utf-8',newline='\n')
    print(json.dumps({'output':str(args.output),'sections':len(model['sections']),'topics':len(model['topics']),'bytes':args.output.stat().st_size},ensure_ascii=False))

if __name__=='__main__':main()
