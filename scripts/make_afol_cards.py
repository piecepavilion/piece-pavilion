"""
Render the 3 branded text cards for the "AFOL celebrities" Reel
(David Beckham / Ed Sheeran / Terry Crews), 1080x1920 PNG each.

Cards 1 & 2 are TRANSPARENT overlays with a built-in dark scrim, meant to be
dropped on top of your own celebrity/LEGO photos in a video editor. Card 3 is a
fully-branded solid end card (no photo needed).

Reuses the headless-Chrome renderer pattern from make_reel.py / make_og_images.py.

Usage:  python make_afol_cards.py
Output: scripts/reels/afol-celebs/card1-hook.png, card2-reveal.png, card3-cta.png
"""

import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(HERE, "reels", "afol-celebs")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOGO_URL = "file:///" + os.path.join(REPO, "logo-white.png").replace("\\", "/")

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.s{width:1080px;height:1920px;position:relative;display:flex;flex-direction:column;
   justify-content:flex-end;align-items:center;text-align:center;padding:0 90px 260px}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.tsh{text-shadow:0 6px 26px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.5)}
/* scrim so white text reads over any photo */
.scrim{position:absolute;inset:0;
   background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,0) 34%,rgba(0,0,0,.30) 60%,rgba(0,0,0,.82) 100%)}
.kick{position:relative;color:#ffd700;font-weight:800;letter-spacing:.16em;
   text-transform:uppercase;font-size:40px;margin-bottom:30px}
.hook{position:relative;color:#fff;font-size:104px;line-height:1.04}
.afol{position:relative;color:#fff;font-size:150px;line-height:.98;margin-bottom:24px}
.afol em{color:#ffd700;font-style:normal}
.expand{position:relative;color:#fff;font-size:70px;line-height:1.1}
.handle{position:absolute;bottom:150px;left:0;right:0;color:#fff;font-weight:800;font-size:48px}
/* card 3: solid brand end card */
.cta{justify-content:center;padding:120px 96px;
   background:linear-gradient(150deg,#e3000b 0%,#9b0008 100%);color:#fff}
.cta .mark{width:330px;height:auto;margin-bottom:52px;
   filter:drop-shadow(0 12px 30px rgba(0,0,0,.30))}
.cta .k{color:#ffd700;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
   font-size:38px;margin-bottom:28px}
.cta h1{font-size:98px;line-height:1.03;margin-bottom:40px}
.cta .big{font-size:96px;margin:4px 0 30px}
.cta .sub{font-size:46px;opacity:.95;max-width:840px;line-height:1.35}
.cta .handle{color:#fff}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')

CARDS = {
    "card1-hook": (
        '<div class="s">'
        '<div class="scrim"></div>'
        '<div class="kick">Guess the connection</div>'
        '<h1 class="hook fred tsh">What do David, Ed &amp; Terry all have in common?</h1>'
        '<div class="handle tsh">@piecepavilion</div></div>'),
    "card2-reveal": (
        '<div class="s">'
        '<div class="scrim"></div>'
        '<div class="afol fred tsh">They&#39;re all <em>AFOLs</em></div>'
        '<div class="expand fred tsh">Adult Fans of LEGO&#174;</div>'
        '<div class="handle tsh">@piecepavilion</div></div>'),
    "card3-cta": (
        '<div class="s cta">'
        '<img class="mark" src="' + LOGO_URL + '" alt="Piece Pavilion" />'
        '<div class="k">LEGO isn&#39;t just for kids</div>'
        '<h1 class="fred">Start your own build.</h1>'
        '<div class="big fred">&#128279; Link in bio</div>'
        '<div class="sub">Read our guide to the AFOL hobby &mdash; sets, minifigs &amp; parts '
        'to begin your collection.</div>'
        '<div class="handle">@piecepavilion</div></div>'),
}


def render(body, out_png):
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", body))
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1080,1920",
                    "--default-background-color=00000000", "--virtual-time-budget=8000",
                    "--screenshot=" + out_png, url], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def main():
    for name, body in CARDS.items():
        out = os.path.join(OUT, name + ".png")
        render(body, out)
        print("rendered", out)


if __name__ == "__main__":
    main()
