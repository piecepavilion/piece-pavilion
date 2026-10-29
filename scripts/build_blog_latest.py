"""
Write /blog/latest.json with the most recent blog post's publish timestamp.

Used by the Blog nav link on the homepage to decide whether to pulse the
"New" dot. Freshness window is 6 hours by default (set on the link's
data-fresh-window-hours attribute).

Publish time = the newest blog post index.html's mtime (git preserves
mtime per-file on checkout only inconsistently, so we rely on local
mtime and the pp-ops cron, where files are freshly checked out, writes
the file after regenerating. Date headers inside each post are a
fallback.)
"""

import datetime as dt
import json
import os
import re
from glob import glob

ROOT = os.environ.get("SITE_REPO",
                      os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLOG_DIR = os.path.join(ROOT, "blog")
OUT_PATH = os.path.join(BLOG_DIR, "latest.json")

MONTHS = {m: i + 1 for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December"])}


def parse_date_header(path):
    """Try to extract a human date like 'October 26, 2026' from the post HTML."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            html = f.read(8192)   # the date is near the top
    except Exception:
        return None
    m = re.search(
        r'(?:datetime="([^"]+)"'
        r'|<time[^>]*>\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*</time>'
        r'|"datePublished":\s*"([^"]+)")',
        html,
    )
    if not m:
        return None
    iso, human, dp = m.groups()
    for cand in (iso, dp):
        if cand:
            try:
                return dt.datetime.fromisoformat(cand.replace("Z", "+00:00"))
            except ValueError:
                pass
    if human:
        m2 = re.match(r"([A-Z][a-z]+) (\d{1,2}), (\d{4})", human)
        if m2:
            month = MONTHS.get(m2.group(1))
            if month:
                return dt.datetime(int(m2.group(3)), month, int(m2.group(2)),
                                   12, 0, 0, tzinfo=dt.timezone.utc)
    return None


def main():
    # Respect an existing "promoted" latest.json. Lets the user hand-pin a
    # blog post to flash in the nav for longer than the auto-detected 6h
    # (e.g. to advertise a seasonal post). Delete blog/latest.json to clear.
    if os.path.exists(OUT_PATH):
        try:
            with open(OUT_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if existing.get("source") == "promoted":
                print("latest.json is pinned (source=promoted); leaving it.")
                return
        except Exception:
            pass

    posts = [p for p in glob(os.path.join(BLOG_DIR, "*", "index.html"))]
    if not posts:
        print("No blog posts found.")
        return

    best = None
    best_slug = None
    best_source = None
    for p in posts:
        slug = os.path.basename(os.path.dirname(p))
        parsed = parse_date_header(p)
        if parsed and parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        if parsed:
            candidate, source = parsed, "parsed"
        else:
            # Only fall back to mtime when the post has no date header at all.
            # mtime from `git clone` is checkout time, not publish time, so it
            # would always look "fresh" otherwise.
            candidate = dt.datetime.fromtimestamp(os.path.getmtime(p), tz=dt.timezone.utc)
            source = "mtime"
        if best is None or candidate > best:
            best = candidate
            best_slug = slug
            best_source = source

    out = {
        "published": best.isoformat(timespec="seconds"),
        "slug": best_slug,
        "source": best_source,
    }
    os.makedirs(BLOG_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, separators=(",", ":"))
    print("Wrote {}  ({})".format(OUT_PATH, out))


if __name__ == "__main__":
    main()
