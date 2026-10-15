"""
Inject the "Shop" category dropdown into the header nav and the category links
into the sidebar drawer of every blog page, so the SEO category pages are
reachable site-wide. Idempotent — safe to re-run after adding a new blog post.

Usage:  python add_category_nav.py
"""

import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
STORE = "https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"

DROPDOWN = (
    '        <div class="nav-dropdown">\n'
    '          <a href="/#shop" class="nav-dropdown-toggle">Shop <span class="caret">&#9662;</span></a>\n'
    '          <div class="nav-dropdown-menu">\n'
    '            <a href="/lego-minifigures/">LEGO Minifigures</a>\n'
    '            <a href="/lego-star-wars-minifigures/">Star Wars Minifigures</a>\n'
    '            <a href="/retired-lego-sets/">Retired Sets</a>\n'
    '            <a href="/#shop">What We Carry</a>\n'
    '            <a class="nav-dropdown-all" href="' + STORE + '" target="_blank" rel="noopener">All Products on BrickLink &rarr;</a>\n'
    '          </div>\n'
    '        </div>'
)

SIDEBAR_LINKS = (
    '      <li><a href="/lego-minifigures/">LEGO Minifigures</a></li>\n'
    '      <li><a href="/lego-star-wars-minifigures/">Star Wars Minifigures</a></li>\n'
    '      <li><a href="/retired-lego-sets/">Retired Sets</a></li>'
)


def patch(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    before = html

    # 1) Header nav: replace the bare "What We Carry" link with the dropdown.
    if "nav-dropdown" not in html:
        html = re.sub(
            r'(<nav class="header-nav">\s*)<a href="/#shop">What We Carry</a>',
            lambda m: m.group(1) + DROPDOWN,
            html, count=1)

    # 2) Sidebar drawer: add category links after the "What We Carry" item.
    if 'sidebar-links' in html and '/lego-minifigures/' not in html.split('</nav>')[0]:
        html = re.sub(
            r'(<li><a href="/#shop">What We Carry</a></li>)',
            lambda m: m.group(1) + "\n" + SIDEBAR_LINKS,
            html, count=1)

    if html == before:
        print("  unchanged:", os.path.relpath(path, REPO))
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("  patched:  ", os.path.relpath(path, REPO))
    return True


def main():
    files = [os.path.join(REPO, "blog", "index.html")]
    files += glob.glob(os.path.join(REPO, "blog", "*", "index.html"))
    n = sum(patch(p) for p in sorted(set(files)))
    print("Patched {} file(s).".format(n))


if __name__ == "__main__":
    main()
