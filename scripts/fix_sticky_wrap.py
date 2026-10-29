"""
Fix the ticker-banner flash on page load.

Problem: pages ship with the yellow .announcement-banner above the sticky
<header>, and script.js later wraps both in .sticky-head and reparents the
banner below the header. That reparenting causes a visible layout jump
("flash") on every page load.

Fix: pre-wrap in HTML. Move the .announcement-banner block to sit AFTER
</header>, then wrap both header and banner in a <div class='sticky-head'>.
script.js then becomes a no-op for layout: the structure already matches
its target shape.
"""

import os
import re
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fix_file(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    if 'class="sticky-head"' in html or "class='sticky-head'" in html:
        return False  # already pre-wrapped

    # Find <div class="announcement-banner"> ... </div> as a block.
    banner_re = re.compile(
        r'<div class="announcement-banner">[\s\S]*?</div>\s*',
        re.MULTILINE,
    )
    banner_match = banner_re.search(html)
    if not banner_match:
        return False  # no banner → nothing to fix (e.g. cart has no ticker)

    banner_block = banner_match.group(0).rstrip() + "\n"

    # Remove the original banner from its position.
    html_no_banner = html[:banner_match.start()] + html[banner_match.end():]

    # Find the <header class="site-header" ... > open tag.
    header_open = re.search(r'<header class="site-header"[^>]*>', html_no_banner)
    if not header_open:
        return False
    # Find its matching </header>. The header is a flat block (no nested
    # headers in these pages), so a simple non-greedy find works.
    close_m = re.search(r'</header>\s*', html_no_banner[header_open.end():])
    if not close_m:
        return False
    header_close_abs = header_open.end() + close_m.end()

    # Insert <div class="sticky-head"> right before the header, drop the
    # banner right after </header>, and close the wrapper.
    wrapped = (
        html_no_banner[:header_open.start()]
        + '<div class="sticky-head">\n  '
        + html_no_banner[header_open.start():header_close_abs].rstrip()
        + "\n  "
        + banner_block
        + "  </div> <!-- /.sticky-head -->\n"
        + html_no_banner[header_close_abs:]
    )

    if wrapped == html:
        return False
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(wrapped)
    return True


def main():
    patterns = ["blog/*/index.html"]
    pages = []
    for p in patterns:
        pages.extend(glob(os.path.join(ROOT, p)))
    changed = 0
    for p in pages:
        if fix_file(p):
            changed += 1
    print("Fixed sticky-head wrap on {} of {} pages.".format(changed, len(pages)))


if __name__ == "__main__":
    main()
