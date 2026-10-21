from pathlib import Path
import json
import re
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


class EvidenceIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text()
        cls.data = json.loads(re.search(r'<script id="labData" type="application/json">(.*?)</script>', cls.html, re.S)[1])
        archive = (ROOT / 'archive.html').read_text()
        cls.history = json.loads(re.search(r'<script id="journeyData" type="application/json">(.*?)</script>', archive, re.S)[1])

    def test_original_records_are_preserved_exactly(self):
        self.assertEqual(self.data['history']['messages'], self.history['messages'])

    def test_every_evidence_reference_resolves(self):
        ids = {m['id'] for m in self.history['messages']}
        for section in self.data['tech']['sections'] + self.data['tutorial']['lessons']:
            for ref in section['evidence']:
                if isinstance(ref, str):
                    self.assertIn(ref, ids)
                elif 'messageId' in ref:
                    self.assertIn(ref['messageId'], ids)
                else:
                    self.assertIn(ref['path'], self.data['documents'])

    def test_prompt_response_pairs_are_available(self):
        ids = {m['id'] for m in self.history['messages']}
        for message in self.history['messages']:
            if message['kind'] == 'prompt':
                self.assertIn(message['id'] + 'r', ids)

    def test_tutorial_has_artifact_and_verification_for_every_step(self):
        self.assertEqual(len(self.data['tutorial']['lessons']), 8)
        for lesson in self.data['tutorial']['lessons']:
            for field in ('goal', 'teacherTask', 'inputs', 'prompt', 'expected', 'checks', 'challenge', 'evidence'):
                self.assertTrue(lesson[field], (lesson['id'], field))

    def test_download_and_kit_match(self):
        with zipfile.ZipFile(ROOT / 'downloads/eccr-starter-kit.zip') as archive:
            expected = {
                'eccr-starter-kit/' + path.relative_to(ROOT / 'starter').as_posix()
                for path in (ROOT / 'starter').rglob('*')
                if path.is_file() and not any(part.startswith('.') or part == '__pycache__'
                                             for part in path.relative_to(ROOT / 'starter').parts)
            }
            self.assertEqual({name for name in archive.namelist() if not name.endswith('/')}, expected)
            for name in archive.namelist():
                if not name.endswith('/'):
                    relative = '/'.join(name.split('/')[1:])
                    self.assertEqual(archive.read(name), (ROOT / 'starter' / relative).read_bytes())

    def test_site_has_no_template_tokens(self):
        for token in ('__STYLE__', '__DATA__', '__RUNTIME__'):
            self.assertNotIn(token, self.html)


if __name__ == '__main__':
    unittest.main()
