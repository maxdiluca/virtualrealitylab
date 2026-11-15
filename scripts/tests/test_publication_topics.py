"""Regression cases for evidence boundaries and the new-paper build workflow."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('publication_topics', Path(__file__).parents[1]/'build-publication-topics.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class TopicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocab = m.load_yaml(m.ROOT/'data/publication_topics.yaml')

    def classify(self, **record):
        return m.classify(dict(title='A new interface study', **record), self.vocab)

    def test_aliases_deduplicate_without_editing_source(self):
        record = dict(title='VR interfaces', tags=['VR', 'virtual reality', 'Virtual Reality'])
        before = copy.deepcopy(record)
        result = m.classify(record, self.vocab)
        self.assertEqual(result['topics'], ['virtual reality'])
        self.assertEqual(record, before)

    def test_new_paper_needs_no_tags(self):
        result = m.classify(dict(title='Wearable Haptics for Text Entry in VR'), self.vocab)
        self.assertEqual(set(result['topics']), {'wearable haptics','wearable devices','haptics','text entry','virtual reality'})
        self.assertEqual(result['issues'], [])

    def test_background_does_not_become_a_label(self):
        result = self.classify(tags=['augmented reality'], abstract='Previous virtual reality work motivated a smartphone study.')
        self.assertNotIn('virtual reality', result['topics'])
        self.assertIn('virtual reality', result['suggestions'])

    def test_editorial_keywords_require_review(self):
        result = self.classify(tags=['haptics'], keywords=['Embodiment'], keywords_kind='editorial')
        self.assertNotIn('embodiment', result['topics'])
        self.assertIn('embodiment', result['suggestions'])

    def test_published_keywords_and_parents(self):
        result = self.classify(keywords=['LLM', 'Large language model'], keywords_kind='published')
        self.assertEqual(set(result['topics']), {'large language models','artificial intelligence'})
        self.assertEqual(len(result['topics']), 2)

    def test_acronym_case_word_boundaries_and_negation(self):
        self.assertNotIn('augmented reality', m.classify({'title':'Particle motion analysis'},self.vocab)['topics'])
        result = m.classify({'title':'Interfaces without haptics in VR'},self.vocab)
        self.assertNotIn('haptics', result['topics'])
        self.assertIn('haptics', result['suggestions'])

    def test_unknown_keywords_are_surfaced_without_invention(self):
        result = self.classify(tags=['virtual reality'],keywords=['olfactory interfaces'],keywords_kind='published')
        self.assertEqual(result['topics'], ['virtual reality'])
        self.assertEqual(result['unmatched_keywords'], ['olfactory interfaces'])

    def test_unknown_tags_and_empty_coverage_are_errors(self):
        self.assertTrue(self.classify(tags=['a new unregistered topic'])['issues'])
        self.assertTrue(self.classify()['issues'])

    def test_reviewed_addition_needs_matching_evidence(self):
        record = dict(title='A device',abstract='A back-mounted device provides force feedback.')
        rule = {'include':[dict(topic='wearable haptics',field='abstract',quote='back-mounted device')]}
        result = m.classify(record,self.vocab,rule)
        self.assertIn('wearable haptics',result['topics'])
        rule['include'][0]['quote']='an invented sentence'
        with self.assertRaisesRegex(ValueError,'no longer occurs'):
            m.classify(record,self.vocab,rule)

    def test_exclusions_override_rules_and_parent_expansion(self):
        result = m.classify({'title':'Wearable haptics in VR'}, self.vocab, {'exclude':[dict(topic='haptics',reason='Explicit test exclusion')]})
        self.assertNotIn('haptics',result['topics'])
        self.assertIn('wearable haptics',result['topics'])

    def test_ambiguous_aliases_and_parent_cycles_are_rejected(self):
        v=copy.deepcopy(self.vocab)
        v['topics'][1]['aliases'].append('VR')
        with self.assertRaisesRegex(ValueError,'Ambiguous'):
            m.validate_vocabulary(v)
        v=copy.deepcopy(self.vocab)
        v['topics'][0]['broader']=['virtual reality']
        with self.assertRaisesRegex(ValueError,'Cycle'):
            m.validate_vocabulary(v)

    def test_new_bundle_is_discovered_and_rebuild_is_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            shutil.copytree(m.ROOT/'data',root/'data')
            shutil.copytree(m.ROOT/'content/publication',root/'content/publication')
            existing_count=len(list((root/'content/publication').glob('*/index.md')))
            new=root/'content/publication/test-new-paper/index.md'
            new.parent.mkdir()
            new.write_text('---\ntitle: Wearable haptics in VR\nkeywords: [Text Entry]\nkeywords_kind: published\n---\n')
            before=new.read_bytes()
            index,report=m.generate(root)
            self.assertEqual((index,report),m.generate(root))
            data=json.loads(index)
            self.assertEqual(len(data['publications']),existing_count+1)
            self.assertIn('text entry',data['publications']['test-new-paper']['topics'])
            self.assertEqual(new.read_bytes(),before)
            reviewed=root/'content/publication/chang-2025-hapticwings/index.md'
            reviewed.write_text(reviewed.read_text()+'\nChanged source\n')
            with self.assertRaisesRegex(ValueError,'decisions are stale'):
                m.generate(root)

    def test_current_collection_regressions(self):
        index,_=m.generate(m.ROOT)
        data=json.loads(index)['publications']
        self.assertIn('embodiment',data['chang-2025-hapticwings']['topics'])
        self.assertIn('3d reconstruction',data['ai-2026-articulation']['topics'])
        self.assertNotIn('virtual reality',data['low-2025-smartphone-embodiment']['topics'])
        self.assertNotIn('gesture interaction',data['rapata-2026-implicit-gaze-slide']['topics'])


if __name__=='__main__':
    unittest.main()
