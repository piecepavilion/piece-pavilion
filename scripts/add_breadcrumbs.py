"""
Add BreadcrumbList JSON-LD schema to public pages missing one.

Google renders breadcrumb trails in search results instead of raw URLs
when this is present, which improves click-through rate.

Skips /employees/, cart, spotlight (both noindex).
"""

import json
import os
import re
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://piecepavilion.com"

SKIP = {"cart/index.html", "spotlight/index.html", "index.html"}


def breadcrumbs_for(rel):
    """Build a BreadcrumbList crumb trail for a page's relative path."""
    rel = rel.replace("\\", "/")
    parts = [p for p in rel.rsplit("/index.html", 1)[0].split("/") if p]
    items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"}]
    pos = 2
    prefix = ""
    section_names = {
        "blog": "Blog",
        "parts": "Parts",
        "finder": "Product Finder",
        "links": "Links",
        "lego-minifigures": "LEGO Minifigures",
        "lego-star-wars-minifigures": "Star Wars Minifigures",
        "retired-lego-sets": "Retired Sets",
    }
    for i, p in enumerate(parts):
        prefix += "/" + p
        name = section_names.get(p)
        if name is None:
            # last part of a path = humanize slug
            name = p.replace("-", " ").title()
        items.append({"@type": "ListItem", "position": pos, "name": name,
                      "item": BASE + prefix + "/"})
        pos += 1
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }


def inject(path):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    if "BreadcrumbList" in html:
        return False
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    if rel in SKIP:
        return False
    crumbs = breadcrumbs_for(rel)
    block = ('  <script type="application/ld+json">\n' +
             json.dumps(crumbs, ensure_ascii=False, indent=2) + "\n  </script>\n")
    new = re.sub(r"(\s*</head>)", "\n" + block + r"\1", html, count=1)
    if new == html:
        return False
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(new)
    return True


def main():
    pages = sorted(glob(os.path.join(ROOT, "**", "index.html"), recursive=True))
    pages = [p for p in pages if "employees" not in p.replace("\\", "/").split("/")]
    changed = 0
    for p in pages:
        if inject(p):
            changed += 1
    print("Added BreadcrumbList to " + str(changed) + " pages.")


if __name__ == "__main__":
    main()
