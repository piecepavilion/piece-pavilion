"""
Regenerate sitemap.xml from the current filesystem.

Walks the repo for every public /index.html (skips /employees/), writes
URL + current lastmod + reasonable changefreq + priority. Priority
heuristic:
  1.0 — homepage
  0.9 — top-level category pages (lego-minifigures, retired-lego-sets, parts, finder)
  0.8 — blog index, blog posts, category pages
  0.7 — individual parts pages
"""

import datetime as dt
import os
from glob import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://piecepavilion.com"
SITEMAP = os.path.join(ROOT, "sitemap.xml")
TODAY = dt.date.today().isoformat()


def walk():
    out = []
    for path in sorted(glob(os.path.join(ROOT, "**", "index.html"), recursive=True)):
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        if rel.startswith("employees/") or rel == "cart/index.html" or rel == "spotlight/index.html":
            continue
        if rel == "index.html":
            url = BASE + "/"
        else:
            url = BASE + "/" + rel.rsplit("/index.html", 1)[0] + "/"
        out.append((url, path))
    return out


def rank(url):
    path = url.replace(BASE, "")
    if path == "/":
        return ("daily", "1.0")
    top = ["/lego-minifigures/", "/lego-star-wars-minifigures/", "/retired-lego-sets/",
           "/parts/", "/finder/"]
    if path in top:
        return ("weekly", "0.9")
    if path == "/blog/":
        return ("daily", "0.8")
    if path.startswith("/blog/"):
        return ("monthly", "0.8")
    if path.startswith("/parts/"):
        return ("weekly", "0.7")
    return ("monthly", "0.6")


def lastmod_for(path):
    try:
        ts = os.path.getmtime(path)
        return dt.date.fromtimestamp(ts).isoformat()
    except Exception:
        return TODAY


def main():
    urls = walk()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, path in urls:
        freq, prio = rank(url)
        lines.append("  <url>")
        lines.append("    <loc>" + url + "</loc>")
        lines.append("    <lastmod>" + lastmod_for(path) + "</lastmod>")
        lines.append("    <changefreq>" + freq + "</changefreq>")
        lines.append("    <priority>" + prio + "</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    with open(SITEMAP, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    print("Wrote sitemap with " + str(len(urls)) + " URLs.")


if __name__ == "__main__":
    main()
