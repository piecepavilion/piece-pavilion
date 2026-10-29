"""
Surgical SEO upgrade for every parts page:

1. Fix HTML entities (&ldquo;, &rdquo;, &hellip;, etc.) inside JSON-LD scripts.
   JSON-LD is parsed as a plain string; HTML entities are not decoded, so
   Google sees literal "&ldquo;" in product descriptions.

2. Enhance the existing Product schema with AggregateOffer (price range +
   availability + URL) from the current finder-data.json. This lets Google
   show the price directly in the search snippet.

3. Append a FAQPage schema with 3 Q&As per part (part names + colors + sets).
   FAQ markup renders as expandable boxes in search results, taking much
   more SERP real estate than a plain blue link.

Run from the repo root:  python scripts/enhance_parts_schema.py
"""

import json
import os
import re
import sys
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS_DIR = os.path.join(ROOT, "parts")
FINDER_DATA = os.path.join(ROOT, "finder-data.json")

# Entities that must be converted to Unicode when they live inside JSON-LD.
ENTITY_FIXES = [
    (r"&ldquo;",  "“"),
    (r"&rdquo;",  "”"),
    (r"&lsquo;",  "‘"),
    (r"&rsquo;",  "’"),
    (r"&hellip;", "…"),
    (r"&mdash;",  "—"),
    (r"&ndash;",  "–"),
    (r"&nbsp;",   " "),
    (r"&amp;",    "&"),
]


def load_finder():
    with open(FINDER_DATA, "r", encoding="utf-8") as f:
        data = json.load(f)
    by_part = {}
    for it in data.get("items", []):
        no = str(it.get("no") or "").strip()
        if not no:
            continue
        by_part.setdefault(no, []).append(it)
    return by_part


def offers_for(part_no, lots):
    if not lots:
        return None
    prices = [float(l.get("price") or 0) for l in lots if l.get("price")]
    prices = [p for p in prices if p > 0]
    if not prices:
        return None
    colors = sorted({l.get("color") for l in lots if l.get("color")})
    url = ("https://store.bricklink.com/PiecePavilion?utm_source=parts_page"
           "&utm_medium=schema&p=PiecePavilion#/shop?o=%7B%22q%22%3A%22" + part_no + "%22%7D")
    offer = {
        "@type": "AggregateOffer",
        "url": url,
        "priceCurrency": "USD",
        "lowPrice": round(min(prices), 2),
        "highPrice": round(max(prices), 2),
        "offerCount": len(lots),
        "availability": "https://schema.org/InStock",
        "seller": {"@type": "Organization", "name": "Piece Pavilion"},
    }
    if colors:
        offer["itemOffered"] = {"@type": "Product", "additionalProperty": [
            {"@type": "PropertyValue", "name": "Color", "value": c} for c in colors[:10]
        ]}
    return offer


def extract_part_meta(html):
    """Pull a clean part name + description from the existing page for FAQs."""
    name_m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    desc_m = re.search(r'<meta name="description" content="([^"]+)"', html)
    name = name_m.group(1) if name_m else ""
    desc = desc_m.group(1) if desc_m else ""
    # Try to extract the "officially called" bit from the description
    canonical_m = re.search(r"officially called &quot;([^&]+)&quot;", desc)
    canonical = canonical_m.group(1) if canonical_m else ""
    # Try to extract alt name
    alt_m = re.search(r"also known as the ([^.]+)\.", desc)
    alt = alt_m.group(1).strip() if alt_m else ""
    return name, canonical, alt, desc


def build_faq(part_no, canonical, alt, lots):
    colors = sorted({l.get("color") for l in lots if l.get("color")})[:8]
    conditions = sorted({l.get("cond") for l in lots if l.get("cond")})
    price_range = ""
    if lots:
        prices = [float(l.get("price") or 0) for l in lots if l.get("price") and l.get("price") > 0]
        if prices:
            if min(prices) == max(prices):
                price_range = "about $" + "{:.2f}".format(min(prices))
            else:
                price_range = "between $" + "{:.2f}".format(min(prices)) + " and $" + "{:.2f}".format(max(prices))
    qa = []
    name_phrase = canonical or ("part " + part_no)
    qa.append({
        "@type": "Question",
        "name": "What is LEGO part " + part_no + "?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": ("LEGO part " + part_no + " is officially called “" + canonical + "”"
                     + (", also known as the " + alt + "." if alt else ".")
                     + " It’s a standard LEGO element you can find in many sets.")
        },
    })
    if colors:
        qa.append({
            "@type": "Question",
            "name": "What colors is LEGO part " + part_no + " available in at Piece Pavilion?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "We currently stock part " + part_no + " in these colors: " +
                        ", ".join(colors) + ". Inventory updates every 30 minutes from our live BrickLink store."
            },
        })
    if price_range:
        qa.append({
            "@type": "Question",
            "name": "How much does LEGO part " + part_no + " cost?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "At Piece Pavilion, LEGO part " + part_no + " ranges " + price_range +
                        " depending on color and condition. Check our BrickLink store for live pricing."
            },
        })
    if conditions:
        qa.append({
            "@type": "Question",
            "name": "Can I buy used LEGO part " + part_no + "?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes. We stock " + part_no + " in " + " and ".join(conditions).lower() +
                        " condition. All used parts are cleaned and inspected before listing."
            },
        })
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": qa,
    }


def enhance_file(path, finder):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    part_no = os.path.basename(os.path.dirname(path))
    lots = finder.get(part_no, [])

    original = html

    # 1) Fix HTML entities inside every <script type="application/ld+json"> block
    def fix_jsonld(m):
        body = m.group(1)
        for pat, rep in ENTITY_FIXES:
            body = re.sub(pat, rep, body)
        return '<script type="application/ld+json">' + body + '</script>'

    html = re.sub(
        r'<script type="application/ld\+json">([\s\S]*?)</script>',
        fix_jsonld, html,
    )

    # 2) Enhance Product schema: inject "offers" if missing
    offer = offers_for(part_no, lots)
    if offer and '"offers"' not in html:
        # Find the Product block and inject offers before the closing brace of that specific object.
        prod_re = re.compile(
            r'(<script type="application/ld\+json">\s*\{\s*"@context":\s*"https://schema.org",\s*"@type":\s*"Product"[\s\S]*?)(\n?\s*\}\s*</script>)'
        )
        offer_json = json.dumps(offer, ensure_ascii=False, indent=2)
        # indent each line by 2 spaces so it nests nicely
        indented = "\n".join("  " + line for line in offer_json.split("\n"))
        html = prod_re.sub(
            lambda m: m.group(1).rstrip().rstrip(",") + ",\n  \"offers\": " + offer_json + m.group(2),
            html, count=1,
        )

    # 3) Append FAQPage before </head> if not already present
    if '"@type": "FAQPage"' not in html:
        name, canonical, alt, _desc = extract_part_meta(html)
        faq = build_faq(part_no, canonical, alt, lots)
        faq_json = json.dumps(faq, ensure_ascii=False, indent=2)
        faq_block = '  <script type="application/ld+json">\n' + faq_json + '\n  </script>\n'
        html = re.sub(r'(\s*</head>)', '\n' + faq_block + r'\1', html, count=1)

    if html != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(html)
        return True
    return False


def main():
    finder = load_finder()
    pages = sorted(glob(os.path.join(PARTS_DIR, "*", "index.html")))
    changed = 0
    for p in pages:
        if enhance_file(p, finder):
            changed += 1
    print("Enhanced {} of {} parts pages.".format(changed, len(pages)))


if __name__ == "__main__":
    main()
