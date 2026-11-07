import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('listing',ROOT/'scripts/rebuild_blog_listing.py')
listing=importlib.util.module_from_spec(spec);spec.loader.exec_module(listing)
class ThumbnailLabels(unittest.TestCase):
 def test_only_requested_labels_are_overridden(self):
  cases=[('bricklink-sos-part-2-november-2026','BrickLink SOS Part 2'),('bricklink-sos-november-2026-outage','BrickLink SOS: What We Know About the November 2026 Outage')]
  self.assertEqual(len(listing.THUMB_PHRASE_OVERRIDES),2)
  for slug,title in cases:self.assertEqual(listing.thumb_phrase(title,slug),'Bricklink Sos')
  self.assertEqual(listing.thumb_phrase('BrickLink SOS Part 2','unrelated'),'Bricklink Sos Part')
 def test_listing_preserves_headlines_and_cache_busts_only_fixed_covers(self):
  posts=[dict(slug=slug,title=title,desc='Keep the description',date_display='November 6, 2026') for slug,title in [('bricklink-sos-part-2-november-2026','BrickLink SOS Part 2'),('bricklink-sos-november-2026-outage','BrickLink SOS: What We Know About the November 2026 Outage'),('unrelated','Another title')]]
  html=listing.render_cards(posts)
  for p in posts:self.assertIn('<h2>'+p['title']+'</h2>',html)
  self.assertEqual(html.count('?v=20261107-labels'),2)
  self.assertIn('/thumb/unrelated.png"',html)
 def test_actual_listing_keeps_article_names(self):
  html=(ROOT/'blog/index.html').read_text()
  self.assertIn('<h2>BrickLink SOS Part 2</h2>',html)
  self.assertIn('<h2>BrickLink SOS: What We Know About the November 2026 Outage</h2>',html)
  self.assertEqual(html.count('?v=20261107-labels'),2)
if __name__=='__main__':unittest.main()
