"""
Sync the top navigation + ticker banner on every parts page to match the
homepage. Parts pages shipped with a stripped-down nav (4 links, no Shop
dropdown, no viewer badge). This script replaces the header, keeps the
page's own announcement text, and wraps both in .sticky-head.

Covers parts/index.html AND every parts/<part>/index.html.
"""

import os
import re
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAV_HTML = '''<nav class="header-nav">
        <div class="nav-dropdown">
          <a href="/#shop" class="nav-dropdown-toggle" aria-haspopup="true">
            <span class="nav-brick-icon" aria-hidden="true">
              <svg viewBox="0 0 32 20" width="22" height="14" fill="currentColor">
                <rect x="0" y="4" width="32" height="16" rx="2"/>
                <rect x="4" y="0" width="6" height="6" rx="1"/>
                <rect x="13" y="0" width="6" height="6" rx="1"/>
                <rect x="22" y="0" width="6" height="6" rx="1"/>
              </svg>
            </span>
            <span>Shop</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="/lego-minifigures/">LEGO Minifigures</a>
            <a href="/lego-star-wars-minifigures/">Star Wars Minifigures</a>
            <a href="/retired-lego-sets/">Retired Sets</a>
            <a href="/#shop">What We Carry</a>
            <a class="nav-dropdown-all" href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">All Products on BrickLink &rarr;</a>
          </div>
        </div>
        <a href="/#featured">Featured</a>
        <a href="/parts/">Parts</a>
        <a href="/#about">About</a>
        <a href="/blog/" id="nav-blog" class="nav-blog" data-fresh-window-hours="6">
          <span class="nav-blog-new">New</span><span>&nbsp;Blog</span>
        </a>
        <a href="/#sell">Sell</a>
        <a href="/spotlight/">Spotlight</a>
        <a href="/employees/" class="nav-staff">Staff</a>
      </nav>'''

ACTIONS_HTML = '''<div class="header-actions">
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="header-rating"
           aria-label="View our BrickLink feedback and reviews">
          <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <!--FEEDBACK-->100%<!--/FEEDBACK-->
        </a>
        <a href="/cart/" class="header-cart" aria-label="View cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="cart-count" style="display:none">0</span>
        </a>
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="btn-primary header-shop">Shop Now &rarr;</a>
        <div class="viewer-badge" id="viewer-badge" aria-label="Total viewers">
          <span class="viewer-count" id="viewer-count">&mdash;</span>
          <span class="viewer-label">Viewer count.</span>
        </div>
        <button class="header-burger" id="header-burger" aria-label="Open menu">&#9776;</button>
      </div>'''


def sync_file(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    original = html

    # Replace <nav class="header-nav">...</nav>
    nav_re = re.compile(r'<nav class="header-nav">[\s\S]*?</nav>', re.MULTILINE)
    if nav_re.search(html):
        html = nav_re.sub(NAV_HTML, html, count=1)

    # Replace <div class="header-actions">...</div> — balanced match
    # Use a count-aware regex since header-actions contains nested <div>s on
    # some pages. Simplest: find the opening tag, then walk until balanced.
    start = html.find('<div class="header-actions">')
    if start >= 0:
        depth = 0
        i = start
        end = None
        while i < len(html):
            if html.startswith('<div', i):
                depth += 1
                i = html.find('>', i) + 1
            elif html.startswith('</div>', i):
                depth -= 1
                i += len('</div>')
                if depth == 0:
                    end = i
                    break
            else:
                i += 1
        if end:
            html = html[:start] + ACTIONS_HTML + html[end:]

    if html == original:
        return False

    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    return True


def main():
    pages = [os.path.join(ROOT, "parts", "index.html")]
    pages += glob(os.path.join(ROOT, "parts", "*", "index.html"))
    changed = 0
    for p in pages:
        if sync_file(p):
            changed += 1
    print("Synced header on {} of {} parts pages.".format(changed, len(pages)))


if __name__ == "__main__":
    main()
