"""Content-distribution and source-coverage diagnostics; not an editorial quality score."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from build_note import DataExtractor,validate

class Plain(HTMLParser):
    def __init__(self):super().__init__();self.parts=[];self.blocked=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'):self.blocked+=1
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.blocked=max(0,self.blocked-1)
    def handle_data(self,data):
        if not self.blocked:self.parts.append(data)

def length(text):
    reader=Plain();reader.feed(text)
    return len(re.sub(r'\s+','',''.join(reader.parts)))

def item_length(item,kind):
    key={'body':'cells','intro':'introCells','summary':'summaryCells'}[kind]
    if key in item:return sum(length(c['source']) if c['type']=='html' else len(re.sub(r'\s+','',c['source'])) for c in item[key])
    if kind=='body':return length(item.get('body',''))
    return len(re.sub(r'\s+','',item.get(kind,'')))

def audit(model,coverage=None):
    validate(model);topics=model['topics'];topic_ids={t['id'] for t in topics};source_ids={s['id'] for s in model.get('sources',[])}
    sections=[];warnings=[]
    for section in model['sections']:
        members=[t for t in topics if t['section']==section['id']]
        opening=item_length(section,'intro');closing=item_length(section,'summary');body=sum(item_length(t,'body') for t in members)
        sections.append({'id':section['id'],'topics':len(members),'intro_chars':opening,'summary_chars':closing,'body_chars':body})
        if body<opening+closing:warnings.append({'section':section['id'],'issue':'Body is smaller than its introduction and summary combined; inspect for missing substance rather than padding.'})
    errors=[];counts={}
    if coverage is not None:
        for unit in coverage.get('units',[]):
            status=unit.get('status');counts[status]=counts.get(status,0)+1
            if status not in ('covered','intentional-omission','agenda-only','unread'):errors.append('Invalid coverage status at '+str(unit.get('location')))
            if unit.get('source') not in source_ids:errors.append('Unknown source at '+str(unit.get('location')))
            if not unit.get('location'):errors.append('Coverage location required')
            if status=='covered':
                if not unit.get('topics') or any(t not in topic_ids for t in unit.get('topics',[])):errors.append('Covered unit must refer to existing topics at '+str(unit.get('location')))
            elif not unit.get('reason'):errors.append('Non-covered unit needs a reason at '+str(unit.get('location')))
    return {'topics':len(topics),'sections':sections,'body_chars':sum(s['body_chars'] for s in sections),'section_framing_chars':sum(s['intro_chars']+s['summary_chars'] for s in sections),'warnings':warnings,'coverage_counts':counts,'coverage_errors':errors,'interpretation':'Distribution/coverage checks only; factual fidelity and explanation require source-grounded review.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('note',type=Path);parser.add_argument('--coverage',type=Path);parser.add_argument('--output',type=Path);args=parser.parse_args()
    if args.note.suffix.lower() in ('.html','.htm'):
        reader=DataExtractor();reader.feed(args.note.read_text(encoding='utf-8'));model=json.loads(''.join(reader.parts))
    else:model=json.loads(args.note.read_text(encoding='utf-8-sig'))
    result=audit(model,json.loads(args.coverage.read_text(encoding='utf-8')) if args.coverage else None)
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:args.output.write_text(text+'\n',encoding='utf-8')
    print(text)
    if result['coverage_errors']:raise SystemExit(1)

if __name__=='__main__':main()
