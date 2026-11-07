import importlib.util
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'bricklink-sos-part-3-monday-outage'
spec = importlib.util.spec_from_file_location('listing', ROOT / 'scripts/rebuild_blog_listing.py')
listing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(listing)


class Part3Readability(unittest.TestCase):
    def test_reads_actual_article_reading_time(self):
        parsed = listing.parse_post(SLUG)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed[1]['reading_time_min'], 5)

    def test_only_part3_receives_explicit_card_time(self):
        posts = [dict(slug=slug, title='Sample title', desc='Sample summary',
                      date_display='November 7, 2026', reading_time_min=5)
                 for slug in (SLUG, 'unrelated')]
        rendered = listing.render_cards(posts)
        self.assertEqual(rendered.count('data-reading-time="5"'), 1)
        self.assertIn('/blog/' + SLUG + '/" class="blog-card" data-reading-time="5"', rendered)
        self.assertIn('/blog/unrelated/" class="blog-card">', rendered)

    def test_part3_time_tracks_future_byline_changes(self):
        post = dict(slug=SLUG, title='Sample', desc='Sample',
                    date_display='November 7, 2026', reading_time_min=6)
        self.assertIn('data-reading-time="6"', listing.render_cards([post]))

    def test_listing_has_explicit_time_and_fallback(self):
        text = (ROOT / 'blog/index.html').read_text()
        self.assertEqual(text.count('data-reading-time="5"'), 1)
        self.assertIn("Number(card.getAttribute('data-reading-time'))", text)
        self.assertIn('? articleMinutes : Math.max(2, Math.round(estWords / 220))', text)

    def test_article_keeps_caution_and_shows_checklists(self):
        text = (ROOT / 'blog' / SLUG / 'index.html').read_text()
        self.assertIn('BrickLink status at a glance', text)
        self.assertIn('This is an estimate, not a guaranteed reopening.', text)
        self.assertIn('NONE OF THESE ANSWERS ARE COMPLETE YET.', text)
        self.assertIn('<h3>Buyer checklist</h3>', text)
        self.assertIn('<h3>Seller checklist</h3>', text)
        lists = re.findall(r'<ul class="action-checklist">(.*?)</ul>', text, re.S)
        self.assertEqual(len(lists), 2)
        self.assertTrue(all(item.count('<li>') == 4 for item in lists))
        self.assertIn('11:01 a.m. Eastern / 16:01 UTC', text)


if __name__ == '__main__':
    unittest.main()
