import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'skills/notemaker/scripts'))
from audit_note import audit

class ContentDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.model={'version':2,'title':'Source note','intro':'Overview','summary':'Synthesis','sections':[{'id':'section','title':'Section','intro':'Context '*30,'summary':'Conclusions '*30}], 'topics':[{'id':'topic','title':'Detail','intro':'Question','section':'section','body':'<p>Too little detail.</p>'}], 'sources':[{'id':'source','label':'Material'}]}
    def test_thin_body_is_flagged_without_becoming_a_quality_score(self):
        result=audit(copy.deepcopy(self.model));self.assertTrue(result['warnings'])
        self.assertLess(result['body_chars'],result['section_framing_chars'])
        self.model['topics'][0]['body']='<p>'+'A specific source-grounded explanation. '*100+'</p>'
        result=audit(self.model);self.assertFalse(result['warnings']);self.assertNotIn('score',result)
    def test_missing_topic_and_unexplained_omission_are_detected(self):
        coverage={'units':[{'source':'source','location':'rule 1','status':'covered','topics':['absent']},{'source':'source','location':'rule 2','status':'intentional-omission'}]}
        self.assertEqual(len(audit(self.model,coverage)['coverage_errors']),2)
        coverage['units'][0]['topics']=['topic'];coverage['units'][1]['reason']='Outside this source excerpt'
        self.assertFalse(audit(self.model,coverage)['coverage_errors'])
    def test_code_and_cells_are_measured_without_counting_html_markup(self):
        self.model['topics'][0]['cells']=[{'id':'first','type':'html','source':'<p>actual text</p>'},{'id':'second','type':'code','source':'x = 1'}]
        self.assertEqual(audit(self.model)['body_chars'],len('actualtext')+len('x=1'))

if __name__=='__main__':unittest.main()
