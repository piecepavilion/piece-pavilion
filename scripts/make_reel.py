"""
Build a branded vertical Instagram Reel (1080x1920 MP4) from a blog post's
content — hook -> tips -> "link in bio" CTA, with slow Ken Burns zoom and
crossfades. No audio (add trending audio in the IG app for reach).

Reuses the slug -> content map from make_carousels.py and renders slides with
headless Chrome, then encodes frames with the ffmpeg bundled by imageio-ffmpeg
(no system ffmpeg needed).

Usage:
  python make_reel.py                       # default: best-lego-gifts-for-dad
  python make_reel.py is-used-lego-worth-buying

Output: scripts/reels/<slug>.mp4
"""

import os
import subprocess
import sys
import tempfile

from PIL import Image

from make_carousels import CAROUSELS

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUTROOT = os.path.join(HERE, "reels")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOGO_URL = "file:///" + os.path.join(REPO, "logo-white.png").replace("\\", "/")

W, H = 1080, 1920
FPS = 30
# seconds each slide is on screen (cover, the 3 points, cta)
DUR = [2.6, 3.0, 3.0, 3.0, 3.4]
XFADE = 0.45            # crossfade seconds between slides
ZOOM = 0.06            # Ken Burns: zoom in this fraction over each slide

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.s{width:1080px;height:1920px;position:relative;display:flex;flex-direction:column;
   justify-content:center;align-items:center;text-align:center;padding:120px 96px}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.red{background:linear-gradient(150deg,#e3000b 0%,#9b0008 100%);color:#fff}
.cream{background:#fff8ec;color:#14161d}
.mark{width:360px;height:auto;margin-bottom:54px;filter:drop-shadow(0 12px 30px rgba(0,0,0,.30))}
.kicker{font-weight:800;letter-spacing:.16em;text-transform:uppercase;font-size:34px;opacity:.92;margin-bottom:34px}
.cover h1{font-size:128px;line-height:1.02}
.num{width:150px;height:150px;border-radius:50%;background:#e3000b;color:#fff;font-size:80px;
     display:flex;align-items:center;justify-content:center;margin-bottom:54px}
.point h2{font-size:96px;line-height:1.05;margin-bottom:40px}
.point p{font-size:52px;line-height:1.4;color:#3a4150;max-width:880px}
.cta h2{font-size:78px;line-height:1.08;margin-bottom:30px}
.cta .big{font-size:104px;margin:6px 0 34px}
.cta .sub{font-size:46px;opacity:.93;max-width:840px;line-height:1.35}
.brand{position:absolute;bottom:150px;left:0;right:0;font-weight:800;font-size:40px}
.brand.dark{color:#6b7280}
.handle{position:absolute;bottom:150px;left:0;right:0;font-weight:800;font-size:46px}
"""

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')

MARK = '<img class="mark" src="' + LOGO_URL + '" alt="Piece Pavilion" />'


def cover(d):
    return ('<div class="s red cover">' + MARK +
            '<div class="kicker">' + d["kicker"] + '</div>'
            '<h1 class="fred">' + d["title"] + '</h1>'
            '<div class="brand">piecepavilion.com</div></div>')


def point(d):
    return ('<div class="s cream point">'
            '<div class="num fred">' + str(d["n"]) + '</div>'
            '<h2 class="fred">' + d["title"] + '</h2>'
            '<p>' + d["body"] + '</p>'
            '<div class="brand dark">piecepavilion.com</div></div>')


def cta(d):
    return ('<div class="s red cta">' + MARK +
            '<h2 class="fred">' + d["title"] + '</h2>'
            '<div class="big fred">&#128279; Link in bio</div>'
            '<div class="sub">' + d["sub"] + '</div>'
            '<div class="handle">@piecepavilion</div></div>')


def render_slide(body, out_png):
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", body))
    url = "file:///" + tmp.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=1080,1920",
                    "--virtual-time-budget=8000", "--screenshot=" + out_png, url],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)


def kenburns(img, t):
    """Return a 1080x1920 frame zoomed by (1 + ZOOM*t), t in [0,1], center-cropped."""
    z = 1.0 + ZOOM * t
    nw, nh = int(W * z), int(H * z)
    big = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - W) // 2, (nh - H) // 2
    return big.crop((left, top, left + W, top + H))


def main():
    slug = (sys.argv[1] if len(sys.argv) > 1 else "best-lego-gifts-for-dad")
    c = CAROUSELS[slug]
    os.makedirs(OUTROOT, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        # 1) render the 5 base slides
        builders = [("cover", cover, c["cover"])] + \
                   [("point", point, p) for p in c["points"]] + \
                   [("cta", cta, c["cta"])]
        bases = []
        for i, (_, fn, data) in enumerate(builders):
            p = os.path.join(tmp, "base-{}.png".format(i))
            render_slide(fn(data), p)
            bases.append(Image.open(p).convert("RGB"))
        print("Rendered {} slides".format(len(bases)))

        # 2) write motion frames with crossfades, streaming to disk
        cf = int(XFADE * FPS)
        frame_idx = 0
        tail = None  # last `cf` frames of the previous slide (PIL images)

        def write(im):
            nonlocal frame_idx
            im.save(os.path.join(tmp, "f-{:05d}.png".format(frame_idx)))
            frame_idx += 1

        for si, base in enumerate(bases):
            n = int(DUR[si] * FPS)
            seq = [kenburns(base, k / max(n - 1, 1)) for k in range(n)]
            last = (si == len(bases) - 1)
            if tail is None:
                head_handled = 0
            else:
                # crossfade prev tail with this slide's head
                for k in range(cf):
                    a, b = tail[k], seq[k]
                    write(Image.blend(a, b, (k + 1) / (cf + 1)))
                head_handled = cf
            # middle frames (reserve tail unless this is the last slide)
            end = len(seq) if last else len(seq) - cf
            for k in range(head_handled, end):
                write(seq[k])
            tail = None if last else seq[len(seq) - cf:]

        total = frame_idx
        print("Wrote {} frames ({:.1f}s)".format(total, total / FPS))

        # 3) encode with bundled ffmpeg
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        out = os.path.join(OUTROOT, slug + ".mp4")
        subprocess.run([ff, "-y", "-framerate", str(FPS),
                        "-i", os.path.join(tmp, "f-%05d.png"),
                        "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-preset", "medium", "-crf", "18",
                        "-movflags", "+faststart", out],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Reel -> {}".format(out))


if __name__ == "__main__":
    main()
