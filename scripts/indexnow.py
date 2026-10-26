"""
Submit URLs to IndexNow — the open protocol that notifies Bing, Yandex,
Seznam, Naver, Yep (and anyone else who joins) that content has changed.

Google does NOT participate in IndexNow. For Google, use Search Console's
URL Inspection tool and click "Request Indexing".

Setup (one-time, already done):
  1. A 32-char hex key is published at the repo root as <key>.txt. Its
     contents are the key itself. IndexNow engines fetch this file to
     verify the submitter owns the domain.
  2. The key below must match the filename at the repo root.

Usage:
  python scripts/indexnow.py                         # submit the newest post
  python scripts/indexnow.py <slug>                  # submit one blog slug
  python scripts/indexnow.py <url> [<url> ...]       # submit arbitrary URLs
  python scripts/indexnow.py --all                   # submit every blog post

Returns the HTTP status from the IndexNow hub. 200 or 202 = accepted,
400 = bad request (bad key / malformed), 403 = key file not found at
keyLocation, 422 = URL not in the host, 429 = rate limited.
"""

import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BLOG = os.path.join(REPO, "blog")
HOST = "piecepavilion.com"
KEY = "b13079e16479802b83e5359d29fee379"
KEY_LOCATION = "https://{}/{}.txt".format(HOST, KEY)

# The IndexNow hub forwards to every participating engine in one shot.
ENDPOINT = "https://api.indexnow.org/indexnow"


def all_blog_urls():
    """Every /blog/<slug>/ directory with an index.html."""
    out = []
    for name in sorted(os.listdir(BLOG)):
        p = os.path.join(BLOG, name)
        if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
            out.append("https://{}/blog/{}/".format(HOST, name))
    return out


def newest_blog_url():
    """The slug at the top of blog/index.html — the most recently added card."""
    with open(os.path.join(BLOG, "index.html"), encoding="utf-8") as f:
        page = f.read()
    m = re.search(r'<a href="(/blog/[^"]+/)"\s+class="blog-card"', page)
    if not m:
        raise SystemExit("Could not find top blog card in blog/index.html")
    return "https://{}{}".format(HOST, m.group(1))


def to_url(arg):
    """Accept a full URL, a /path, or a bare slug."""
    if arg.startswith("http"):
        return arg
    if arg.startswith("/"):
        return "https://{}{}".format(HOST, arg)
    return "https://{}/blog/{}/".format(HOST, arg)


def submit(urls):
    if not urls:
        print("Nothing to submit.")
        return
    body = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    print("Submitting {} url(s) to IndexNow...".format(len(urls)))
    for u in urls:
        print("  " + u)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print("Response: HTTP {}".format(r.status))
            payload = r.read().decode("utf-8", errors="replace")
            if payload:
                print(payload)
    except urllib.error.HTTPError as e:
        print("HTTP {}: {}".format(e.code, e.read().decode("utf-8", errors="replace")))


def main():
    args = sys.argv[1:]
    if "--all" in args:
        urls = all_blog_urls()
    elif not args:
        urls = [newest_blog_url()]
    else:
        urls = [to_url(a) for a in args]
    submit(urls)


if __name__ == "__main__":
    main()
