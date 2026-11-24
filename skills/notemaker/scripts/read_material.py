"""Extract source text with slide/page provenance; does not invent or summarize content."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

class TextHTML(HTMLParser):
    def __init__(self):super().__init__();self.parts=[];self.blocked=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'):self.blocked+=1
        if tag in ('p','div','h1','h2','h3','li','tr'):self.parts.append('\n')
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.blocked=max(0,self.blocked-1)
    def handle_data(self,data):
        if not self.blocked:self.parts.append(data)

def extract(path):
    path=Path(path);suffix=path.suffix.lower();units=[];warnings=[]
    if suffix=='.pptx':
        ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
        with zipfile.ZipFile(path) as z:
            names=sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)],key=lambda n:int(re.search(r'(\d+)\.xml$',n)[1]))
            if sum(i.file_size for i in z.infolist())>200*1024*1024:raise ValueError('PPTX expanded size exceeds 200 MiB')
            for i,name in enumerate(names,1):
                tree=ET.fromstring(z.read(name))
                paragraphs=[''.join(t.text or '' for t in p.findall('.//a:t',ns)) for p in tree.findall('.//a:p',ns)]
                units.append({'location':'slide '+str(i),'text':'\n'.join(s for s in paragraphs if s.strip())})
        warnings.append('Text extraction only: images, equations rendered as pictures, animation, and layout require visual review.')
    elif suffix=='.pdf':
        try:from pypdf import PdfReader
        except ImportError:raise SystemExit('PDF extraction needs pypdf or another available PDF reader; do not claim unread pages were read.')
        reader=PdfReader(path)
        units=[{'location':'page '+str(i+1),'text':page.extract_text() or ''} for i,page in enumerate(reader.pages)]
        if any(not u['text'].strip() for u in units):warnings.append('Some pages have no extracted text; inspect for scans/OCR or missing content.')
    elif suffix in ('.html','.htm'):
        parser=TextHTML();parser.feed(path.read_text(encoding='utf-8'));units=[{'location':'HTML document','text':' '.join(parser.parts)}]
    elif suffix in ('.md','.txt'):
        units=[{'location':'lines 1–'+str(len(path.read_text(encoding='utf-8').splitlines())),'text':path.read_text(encoding='utf-8')}]
    else:raise ValueError('Supported: .pptx .pdf .html .md .txt. Legacy .ppt requires conversion; renaming is not conversion.')
    return {'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'units':units,'warnings':warnings}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    result=extract(args.source);args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'output':str(args.output),'units':len(result['units']),'sha256':result['sha256'],'warnings':result['warnings']},ensure_ascii=False))
if __name__=='__main__':main()
