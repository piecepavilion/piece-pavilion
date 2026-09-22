# -*- coding: utf-8 -*-
"""
Instagram carousel (1080x1080 PNGs) for the "Name That LEGO Piece" post.

Slide 1  cover  - six mystery pieces, "Can you name these?"
Slides 2-9      - one piece each: big photo, nickname, official name, part no
Slide 10 CTA    - take the full quiz, link in bio, comment your score

Usage:  python scripts/make_name_that_piece_carousel.py
Output: scripts/carousels/name-that-lego-piece/slide-1.png ... slide-10.png
"""
import html as H
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "carousels", "name-that-lego-piece")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOGO = "file:///" + os.path.join(os.path.dirname(HERE), "logo-white.png").replace("\\", "/")
IMG = "https://img.bricklink.com/ItemImage/PN/%s/%s.png"

# (nickname, official name, part no, image part no, BrickLink color id)
PIECES = [
    ("Cheese slope",     "Slope 30 1 x 1 x 2/3",                                   "54200", "54200", "5"),
    ("Jumper plate",     "Plate, Modified 1 x 2 with 1 Stud (Jumper)",             "15573", "15573", "86"),
    ("Headlight brick",  "Brick, Modified 1 x 1 with Headlight",                   "4070",  "4070",  "86"),
    ("Travis brick",     "Brick, Modified 1 x 1 with Studs on 4 Sides",            "4733",  "4733",  "86"),
    ("Boat stud",        "Plate, Round 2 x 2 with Rounded Bottom",                 "2654",  "2654",  "11"),
    ("SNOT brick",       "Brick, Modified 1 x 1 with Stud on Side",                "87087", "87087", "5"),
    ("Lamp holder",      "Plate, Modified 1 x 1 with Light Attachment",            "4081b", "4081b", "86"),
    ("Grille tile",      "Tile, Modified 1 x 2 Grille with Bottom Groove",         "2412b", "2412b", "86"),
]

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1080px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.slide{width:1080px;height:1080px;position:relative;display:flex;flex-direction:column;padding:90px 90px 80px}
/* cover */
.cover{background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff;justify-content:flex-start}
.cover .kicker{font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:28px;opacity:.92;margin-bottom:18px}
.cover h1{font-size:92px;line-height:1.02;margin-bottom:44px}
.cover .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cover .tile{background:#fff;border-radius:26px;height:250px;display:flex;align-items:center;justify-content:center;padding:26px;position:relative;box-shadow:0 14px 30px rgba(0,0,0,.25)}
.cover .tile img{max-width:100%;max-height:100%;object-fit:contain}
.cover .tile .q{position:absolute;top:14px;right:18px;font-size:44px;color:#e3000b}
.cover .url{position:absolute;bottom:60px;left:90px;font-weight:800;font-size:30px;opacity:.92}
.cover .swipe{position:absolute;bottom:60px;right:90px;font-weight:800;font-size:30px;opacity:.92}
/* piece */
.piece{background:#fff8ec;color:#14161d;justify-content:flex-start}
.piece .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}
.piece .num{width:110px;height:110px;border-radius:50%;background:#e3000b;color:#fff;font-size:54px;display:flex;align-items:center;justify-content:center}
.piece .ask{font-weight:800;font-size:30px;color:#6b7280;letter-spacing:.1em;text-transform:uppercase}
.piece .photo{background:#fff;border-radius:30px;height:420px;display:flex;align-items:center;justify-content:center;padding:40px;box-shadow:0 14px 34px rgba(20,22,29,.10);border:2px solid #f1e6d2}
.piece .photo img{height:340px;width:auto;max-width:100%;object-fit:contain}
.piece .nick{font-size:92px;line-height:1.02;margin-top:44px;color:#14161d}
.piece .name{font-size:36px;line-height:1.3;color:#3a4150;margin-top:16px}
.piece .no{display:inline-block;margin-top:22px;background:#14161d;color:#ffce00;font-weight:900;font-size:28px;letter-spacing:.1em;padding:10px 22px;border-radius:999px}
.piece .foot{position:absolute;bottom:56px;left:90px;right:90px;display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:28px;color:#6b7280}
.piece .foot img{height:64px;width:auto;border-radius:8px}
/* cta */
.cta{background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff;align-items:center;text-align:center;justify-content:center}
.cta .mark{width:380px;height:auto;margin-bottom:40px;filter:drop-shadow(0 10px 28px rgba(0,0,0,.30))}
.cta h2{font-size:72px;line-height:1.08;margin-bottom:22px}
.cta .big{font-size:88px;margin:8px 0 26px}
.cta .sub{font-size:38px;opacity:.94;max-width:840px;line-height:1.35}
.cta .handle{position:absolute;bottom:70px;font-weight:800;font-size:34px}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')


def cover():
    tiles = "".join('<div class="tile"><span class="q fred">?</span><img src="%s" alt=""></div>'
                    % (IMG % (c, im)) for _, _, _, im, c in PIECES[:6])
    return ('<div class="slide cover">'
            '<div class="kicker">Quiz &middot; swipe to reveal</div>'
            '<h1 class="fred">Can you name these LEGO pieces?</h1>'
            '<div class="grid">' + tiles + '</div>'
            '<div class="url">piecepavilion.com</div>'
            '<div class="swipe">Swipe &rarr;</div></div>')


def piece(i, p):
    nick, name, no, im, c = p
    return ('<div class="slide piece">'
            '<div class="top"><div class="num fred">' + str(i) + '</div>'
            '<div class="ask">Builders call it&hellip;</div></div>'
            '<div class="photo"><img src="' + (IMG % (c, im)) + '" alt=""></div>'
            '<div class="nick fred">' + H.escape(nick) + '</div>'
            '<div class="name">' + H.escape(name) + '</div>'
            '<div><span class="no">PART ' + H.escape(no) + '</span></div>'
            '<div class="foot"><img src="' + LOGO + '" alt=""><span>piecepavilion.com</span></div></div>')


def cta():
    return ('<div class="slide cta"><img class="mark" src="' + LOGO + '" alt="">'
            '<h2 class="fred">How many did you know?</h2>'
            '<div class="big fred">&#128279; Link in bio</div>'
            '<div class="sub">71 part names + a 10-question quiz on the blog. Comment your score &#128071; '
            'and tag a builder who thinks they know their bricks.</div>'
            '<div class="handle">@piecepavilion</div></div>')


def render(body, out_png):
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", body))
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1080,1080",
                    "--virtual-time-budget=12000", "--screenshot=" + out_png,
                    "file:///" + tmp.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def main():
    os.makedirs(OUT, exist_ok=True)
    slides = [cover()] + [piece(i, p) for i, p in enumerate(PIECES, 1)] + [cta()]
    for i, body in enumerate(slides, 1):
        render(body, os.path.join(OUT, "slide-%d.png" % i))
    print("%d slides -> %s" % (len(slides), OUT))


if __name__ == "__main__":
    main()
