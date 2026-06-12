"""
Generate branded 1080x1080 Instagram carousel slides (PNG) from blog content,
rendered with headless Chrome. Each post -> cover + tip slides + CTA.

Usage:
  python make_carousels.py                     # all posts
  python make_carousels.py best-lego-gifts-for-dad   # one post

Output: scripts/carousels/<slug>/slide-1.png ...  (upload straight to Instagram)
"""

import html as H
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUTROOT = os.path.join(HERE, "carousels")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

LOGO_URL = "file:///" + os.path.join(os.path.dirname(HERE), "logo-white.png").replace("\\", "/")
LOGO_BIG = '<img class="mark" src="' + LOGO_URL + '" alt="Piece Pavilion" />'
LOGO_SM = '<img src="' + LOGO_URL + '" alt="Piece Pavilion" />'

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1080px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.slide{width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;justify-content:center;padding:100px}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.cover{background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff}
.cover .mark{width:420px;height:auto;margin-bottom:48px;filter:drop-shadow(0 10px 28px rgba(0,0,0,.30))}
.cover .kicker{font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:30px;opacity:.92;margin-bottom:26px}
.cover h1{font-size:100px;line-height:1.03}
.cover .url{position:absolute;bottom:84px;left:100px;font-weight:800;font-size:32px;opacity:.92}
.point{background:#fff8ec;color:#14161d}
.point .num{width:128px;height:128px;border-radius:50%;background:#e3000b;color:#fff;font-size:66px;display:flex;align-items:center;justify-content:center;margin-bottom:48px}
.point h2{font-size:78px;line-height:1.05;margin-bottom:30px}
.point p{font-size:44px;line-height:1.4;color:#3a4150;max-width:860px}
.point .foot{position:absolute;bottom:80px;left:100px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:30px;color:#6b7280}
.point .foot img{height:66px;width:auto;border-radius:8px}
.cta{background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff;align-items:center;text-align:center}
.cta .mark{width:420px;height:auto;margin-bottom:44px;filter:drop-shadow(0 10px 28px rgba(0,0,0,.30))}
.cta h2{font-size:62px;line-height:1.1;margin-bottom:18px}
.cta .big{font-size:96px;margin:10px 0 30px}
.cta .sub{font-size:40px;opacity:.92;max-width:820px;line-height:1.35}
.cta .handle{position:absolute;bottom:84px;font-weight:800;font-size:34px}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')


def cover(d):
    return ('<div class="slide cover">' + LOGO_BIG +
            '<div class="kicker">' + H.escape(d["kicker"]) + '</div>'
            '<h1 class="fred">' + H.escape(d["title"]) + '</h1>'
            '<div class="url">piecepavilion.com</div></div>')


def point(d):
    return ('<div class="slide point">'
            '<div class="num fred">' + str(d["n"]) + '</div>'
            '<h2 class="fred">' + H.escape(d["title"]) + '</h2>'
            '<p>' + H.escape(d["body"]) + '</p>'
            '<div class="foot">' + LOGO_SM + '<span>piecepavilion.com</span></div></div>')


def cta(d):
    return ('<div class="slide cta">' + LOGO_BIG +
            '<h2 class="fred">' + H.escape(d["title"]) + '</h2>'
            '<div class="big fred">&#128279; Link in bio</div>'
            '<div class="sub">' + H.escape(d["sub"]) + '</div>'
            '<div class="handle">@piecepavilion</div></div>')


def render(body_html, out_png):
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", body_html))
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1080,1080",
                    "--default-background-color=00000000", "--virtual-time-budget=8000",
                    "--screenshot=" + out_png, url], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


CAROUSELS = {
    "best-lego-gifts-for-dad": {
        "cover": {"kicker": "Father's Day Gift Guide", "title": "The Best LEGO Gifts for Dad"},
        "points": [
            {"n": 1, "title": "The nostalgic dad", "body": "Gift the theme he grew up on — Classic Space, Pirates, Castle, old-school Town."},
            {"n": 2, "title": "The builder dad", "body": "The parts he always runs out of, in his go-to colors. Fuel for the next MOC."},
            {"n": 3, "title": "On a budget?", "body": "Used LEGO performs the same and stretches your money much further."},
        ],
        "cta": {"title": "The full gift guide is on our blog", "sub": "Read it + shop hand-checked sets, minifigs & parts"},
    },
    "is-used-lego-worth-buying": {
        "cover": {"kicker": "New vs. Used", "title": "Is Used LEGO Worth Buying?"},
        "points": [
            {"n": 1, "title": "It doesn't wear out", "body": "LEGO is ABS plastic — a brick from 1990 still clutches one made today."},
            {"n": 2, "title": "Same build, less money", "body": "Used performs identically to new, for noticeably less. More brick per dollar."},
            {"n": 3, "title": "When new is worth it", "body": "Sealed gifts and mint collectibles — otherwise, buy used and build more."},
        ],
        "cta": {"title": "The full breakdown is on our blog", "sub": "Shop quality-checked, hand-inspected LEGO"},
    },
    "where-to-buy-retired-lego-sets": {
        "cover": {"kicker": "Buyer's Guide", "title": "Where to Buy Retired LEGO Sets"},
        "points": [
            {"n": 1, "title": "Retired ≠ gone", "body": "LEGO stops making sets, but they live on in the secondhand market."},
            {"n": 2, "title": "Where to look", "body": "BrickLink first — compare sellers and prices in one place."},
            {"n": 3, "title": "Spot a fair price", "body": "Check the price guide so you never overpay for that one listing."},
        ],
        "cta": {"title": "Hunting a retired set?", "sub": "Read the guide + browse our store"},
    },
    "how-much-is-your-lego-worth": {
        "cover": {"kicker": "Selling Guide", "title": "How Much Is Your LEGO Worth?"},
        "points": [
            {"n": 1, "title": "What drives value", "body": "Complete sets, retired sets, and rare minifigures are worth the most."},
            {"n": 2, "title": "How to estimate it", "body": "BrickLink's price guide shows real recent sale prices — your baseline."},
            {"n": 3, "title": "The easy way to sell", "body": "We buy collections outright and consign higher-value sets. No sorting."},
        ],
        "cta": {"title": "Ready to sell or consign?", "sub": "Read the guide, then reach out for an offer"},
    },
    "summer-lego-building-ideas": {
        "cover": {"kicker": "Build All Summer", "title": "10 Summer LEGO Building Ideas"},
        "points": [
            {"n": 1, "title": "The one-color challenge", "body": "Build something using only one color. Constraints spark creativity."},
            {"n": 2, "title": "A travel build kit", "body": "Pre-bag 100–200 pieces for the road. Big fun, no loose-piece chaos."},
            {"n": 3, "title": "The summer-long MOC", "body": "Pick one big project and chip away at it all season."},
        ],
        "cta": {"title": "All 10 ideas are on our blog", "sub": "Plus the parts to pull them off"},
    },
    "lego-sorting-and-organizing-tips": {
        "cover": {"kicker": "Stop Digging", "title": "5 LEGO Sorting & Storage Tips"},
        "points": [
            {"n": 1, "title": "Sort by type, not color", "body": "You usually know the shape before the color. Type-first is faster."},
            {"n": 2, "title": "Start broad", "body": "Bricks, plates, tiles, slopes — then subdivide as you grow."},
            {"n": 3, "title": "Right-size your bins", "body": "More small containers beat a few giant ones, every time."},
        ],
        "cta": {"title": "All 5 tips are on our blog", "sub": "Build faster, dig less"},
    },
    "how-to-buy-lego-on-bricklink": {
        "cover": {"kicker": "Beginner's Guide", "title": "How to Buy LEGO on BrickLink"},
        "points": [
            {"n": 1, "title": "The biggest LEGO market", "body": "Any part, any color, retired sets, rare minifigs — it's all there."},
            {"n": 2, "title": "Search smart", "body": "By set number, part number, or color. Learn the catalog in minutes."},
            {"n": 3, "title": "Pick a great seller", "body": "High feedback, quality-checked inventory, fast shipping."},
        ],
        "cta": {"title": "First-timer? We've got you", "sub": "Read the guide + shop our store"},
    },
    "how-to-shop-piece-pavilion": {
        "cover": {"kicker": "How It Works", "title": "How to Shop Piece Pavilion"},
        "points": [
            {"n": 1, "title": "Find our store", "body": "store.bricklink.com/PiecePavilion — sets, parts, minifigs & more."},
            {"n": 2, "title": "Cart & checkout", "body": "Load up one cart, we invoice shipping, you pay. Simple."},
            {"n": 3, "title": "Packed with care", "body": "Every piece hand-checked, shipped fast, no surprises."},
        ],
        "cta": {"title": "Ready to build?", "sub": "Shop Piece Pavilion on BrickLink"},
    },
    "how-to-collect-lego-minifigures": {
        "cover": {"kicker": "Beginner's Guide", "title": "How to Start Collecting LEGO Minifigures"},
        "points": [
            {"n": 1, "title": "Know the types", "body": "Blind-bag CMF series, licensed theme figs, city figures, and rare exclusives — each priced differently."},
            {"n": 2, "title": "Learn the catalog IDs", "body": "Every figure has a BrickLink code (sw, hp, sh, col). It's how you identify and value any minifig."},
            {"n": 3, "title": "Pick a focus", "body": "By theme, character, series, or era. A focus keeps collecting fun and your spending smart."},
        ],
        "cta": {"title": "The full guide is on our blog", "sub": "Read it + shop authentic minifigs & accessories"},
    },
    "how-to-reserve-lego": {
        "cover": {"kicker": "Shop Smarter", "title": "Reserve Any Set, Minifig, or Part"},
        "points": [
            {"n": 1, "title": "See it, save it", "body": "Payday Friday? Gift next month? We'll hold any item with your name on it — free, no deposit."},
            {"n": 2, "title": "Only you can buy it", "body": "We mark the listing reserved for your BrickLink username. It's locked until you check out."},
            {"n": 3, "title": "Just ask", "body": "Email us the item and your BrickLink username. We hold it for up to 2 weeks — plenty of time."},
        ],
        "cta": {"title": "Full how-to is on our blog", "sub": "Spot something you love? Reserve it before it's gone"},
    },
    "how-to-clean-used-lego": {
        "cover": {"kicker": "Care Guide", "title": "How to Clean Used LEGO Safely"},
        "points": [
            {"n": 1, "title": "Lukewarm water only", "body": "Stay under 104°F. Hot water warps bricks and ruins the clutch that makes them snap together."},
            {"n": 2, "title": "Never the dishwasher", "body": "The heat and jets warp and discolor pieces. Hand-wash with a little mild dish soap instead."},
            {"n": 3, "title": "Dry it completely", "body": "Air-dry on a towel, no heat, for a day or two before storing — or you'll trap moisture and risk mildew."},
        ],
        "cta": {"title": "The full how-to is on our blog", "sub": "Or skip it — our used LEGO arrives clean & checked"},
    },
}


def main():
    which = sys.argv[1:] or list(CAROUSELS.keys())
    for slug in which:
        c = CAROUSELS[slug]
        outdir = os.path.join(OUTROOT, slug)
        os.makedirs(outdir, exist_ok=True)
        slides = [("cover", c["cover"])] + [("point", p) for p in c["points"]] + [("cta", c["cta"])]
        builders = {"cover": cover, "point": point, "cta": cta}
        for i, (kind, data) in enumerate(slides, 1):
            out = os.path.join(outdir, "slide-{}.png".format(i))
            render(builders[kind](data), out)
        print("{}: {} slides -> {}".format(slug, len(slides), outdir))


if __name__ == "__main__":
    main()
