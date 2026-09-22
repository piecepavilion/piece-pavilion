# -*- coding: utf-8 -*-
"""
"Name That LEGO Piece" quiz REEL (1080x1920 MP4) - five questions, four choices each.

Format (the standard Instagram quiz-reel convention, since Reels can't take taps):
  intro (2.5s)
  per question: piece photo + 4 nickname options + 4-second countdown bar, then the
                correct answer highlighted with the official name / part no (2.5s)
  score key: 5/5 = 100% ... 0-1/5 = 20% with a rank name, "comment your score", link in bio

Also writes five Story backgrounds (photo + question, options left OFF) so the same
five questions can be posted as Stories with Instagram's tap-to-answer Quiz sticker.

Usage:  python scripts/make_name_that_piece_quiz_reel.py
Output: scripts/reels/name-that-lego-piece-quiz/quiz-reel.mp4
        scripts/reels/name-that-lego-piece-quiz/story-1.png ... story-5.png   (for the Quiz sticker)
        scripts/reels/name-that-lego-piece-quiz/frames/*.png                  (the still slides, for reference)
No audio on purpose - add a trending sound in the Instagram app.
"""
import html as HT
import os
import subprocess
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "reels", "name-that-lego-piece-quiz")
FRAMES = os.path.join(OUT, "frames")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOGO = "file:///" + os.path.join(os.path.dirname(HERE), "logo-white.png").replace("\\", "/")
IMG = "https://img.bricklink.com/ItemImage/PN/%s/%s.png"

W, H = 1080, 1920
FPS = 30
INTRO_S, COUNT_S, REVEAL_S, SCORE_S = 2.5, 4.0, 2.5, 5.0
XFADE = 8  # frames

# Timer bar geometry (must match the CSS below). PIL animates the fill.
BAR_X, BAR_Y, BAR_W, BAR_H = 90, 1440, 900, 16

# (nickname, official name, part no, image no, BrickLink color id, [3 wrong options])
QUESTIONS = [
    ("Cheese slope",    "Slope 30 1 x 1 x 2/3",                        "54200", "54200", "5",
     ["Wedge plate", "Roof tile", "Curved slope"]),
    ("Jumper plate",    "Plate, Modified 1 x 2 with 1 Stud (Jumper)",  "15573", "15573", "86",
     ["Skipper plate", "Half plate", "Offset tile"]),
    ("Headlight brick", "Brick, Modified 1 x 1 with Headlight",        "4070",  "4070",  "86",
     ["SNOT brick", "Lamp holder", "Window brick"]),
    ("Boat stud",       "Plate, Round 2 x 2 with Rounded Bottom",      "2654",  "2654",  "11",
     ["Radar dish", "Wheel hub", "Dome plate"]),
    ("Travis brick",    "Brick, Modified 1 x 1 with Studs on 4 Sides", "4733",  "4733",  "86",
     ["Erling brick", "Cube brick", "Dice brick"]),
]
# Fixed option order per question so the correct answer isn't always in the same slot.
ORDER = [1, 3, 0, 2, 1]  # index where the correct answer lands (A=0..D=3)

SCORE_KEY = [
    ("5 / 5", "100%", "Certified BrickLink Seller"),
    ("4 / 5", "80%",  "Master Builder"),
    ("3 / 5", "60%",  "Bin Sorter"),
    ("2 / 5", "40%",  "Casual Builder"),
    ("0-1 / 5", "20% or less", "Duplo Curious"),
]

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden}
body{font-family:'Nunito',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.fred{font-family:'Fredoka','Nunito',sans-serif;font-weight:700;letter-spacing:-.01em}
.s{width:1080px;height:1920px;position:relative;overflow:hidden}
.abs{position:absolute;left:90px;right:90px}
/* question */
.q{background:#fff8ec;color:#14161d}
.q .kicker{top:300px;font-weight:800;font-size:30px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280;line-height:70px}
.q .dots{position:absolute;left:90px;top:376px;display:flex;gap:10px}
.q .dots span{width:44px;height:8px;border-radius:999px;background:#e5d9c3}
.q .dots span.on{background:#e3000b}
.q .timer{position:absolute;right:90px;top:290px;width:90px;height:90px;border-radius:50%;background:#e3000b;color:#fff;font-size:56px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(227,0,11,.30)}
.q .timer.off{background:#1f6f33;box-shadow:none}
.q .photo{top:410px;height:420px;background:#fff;border-radius:34px;display:flex;align-items:center;justify-content:center;border:2px solid #f1e6d2;box-shadow:0 14px 34px rgba(20,22,29,.10)}
.q .photo img{height:340px;width:auto;max-width:820px;object-fit:contain}
.q h1{top:860px;font-size:64px;line-height:1.05}
.q .opts{top:960px;display:flex;flex-direction:column;gap:16px}
.q .opt{height:100px;border-radius:22px;background:#fff;border:3px solid #e5d9c3;display:flex;align-items:center;gap:22px;padding:0 26px;font-weight:800;font-size:40px;color:#14161d}
.q .opt .l{width:58px;height:58px;border-radius:50%;background:#14161d;color:#ffce00;font-size:30px;display:flex;align-items:center;justify-content:center;flex:none}
.q .opt.right{background:#1f6f33;border-color:#1f6f33;color:#fff}
.q .opt.right .l{background:#fff;color:#1f6f33}
.q .opt.dim{opacity:.35}
.q .track{position:absolute;left:__BX__px;top:__BY__px;width:__BW__px;height:__BH__px;border-radius:999px;background:#e5d9c3}
.q .official{top:1428px;height:70px;display:flex;align-items:center;justify-content:center;gap:16px;font-size:30px;color:#3a4150;font-weight:700}
.q .official b{background:#14161d;color:#ffce00;font-weight:900;font-size:26px;letter-spacing:.08em;padding:8px 18px;border-radius:999px}
.q .foot{top:1500px;display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:26px;color:#6b7280}
.q .foot img{height:56px;width:auto}
/* intro + score (red) */
.red{background:linear-gradient(135deg,#e3000b 0%,#9b0008 100%);color:#fff}
.red .mark{position:absolute;left:50%;transform:translateX(-50%);width:340px;filter:drop-shadow(0 10px 28px rgba(0,0,0,.30))}
.intro .mark{top:330px}
.intro .kicker{top:720px;text-align:center;font-weight:800;font-size:32px;letter-spacing:.14em;text-transform:uppercase;opacity:.92}
.intro h1{top:790px;text-align:center;font-size:118px;line-height:1.0}
.intro .sub{top:1130px;text-align:center;font-size:44px;line-height:1.35;opacity:.94}
.intro .rules{top:1330px;display:flex;justify-content:center;gap:18px}
.intro .rules span{background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:14px 28px;font-weight:800;font-size:30px}
.score .mark{top:290px;width:220px}
.score h1{top:540px;text-align:center;font-size:88px;line-height:1.05}
.score .tbl{top:720px;display:flex;flex-direction:column;gap:14px}
.score .row{display:flex;align-items:center;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.28);border-radius:22px;height:96px;padding:0 28px;font-size:34px;font-weight:800}
.score .row .n{width:200px}
.score .row .p{width:250px;color:#ffce00}
.score .row .r{flex:1;text-align:right;font-weight:700;font-size:32px}
.score .row.top{background:#fff;color:#14161d;border-color:#fff}
.score .row.top .p{color:#e3000b}
.score .cta{top:1300px;text-align:center;font-size:44px;line-height:1.35}
.score .cta b{display:block;font-size:54px;margin-top:12px}
.score .handle{top:1520px;text-align:center;font-weight:800;font-size:34px;opacity:.92}
/* story background (photo + question only; leave room for the IG Quiz sticker below) */
.story .kicker{top:300px}
.story h1{top:880px}
.story .hint{top:1000px;text-align:center;font-size:34px;color:#6b7280;font-weight:700;line-height:1.35}
""".replace("__BX__", str(BAR_X)).replace("__BY__", str(BAR_Y)).replace("__BW__", str(BAR_W)).replace("__BH__", str(BAR_H))

PAGE = ('<!DOCTYPE html><html><head><meta charset="utf-8">'
        '<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700'
        '&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
        '<style>' + CSS + '</style></head><body>{body}</body></html>')


def options(qi):
    nick, _, _, _, _, wrong = QUESTIONS[qi]
    opts = list(wrong)
    opts.insert(ORDER[qi], nick)
    return opts


def dots(qi):
    return '<div class="dots">' + "".join('<span class="%s"></span>' % ("on" if k <= qi else "") for k in range(len(QUESTIONS))) + '</div>'


def question(qi, secs=None, reveal=False):
    nick, name, no, im, c, _ = QUESTIONS[qi]
    opts = options(qi)
    h = '<div class="s q">'
    h += '<div class="abs kicker">Question %d of %d</div>' % (qi + 1, len(QUESTIONS)) + dots(qi)
    h += '<div class="timer fred %s">%s</div>' % ("off" if reveal else "", "&#10003;" if reveal else secs)
    h += '<div class="abs photo"><img src="%s" alt=""></div>' % (IMG % (c, im))
    h += '<h1 class="abs fred">What&rsquo;s this piece called?</h1>'
    h += '<div class="abs opts">'
    for k, o in enumerate(opts):
        cls = "opt"
        if reveal:
            cls += " right" if o == nick else " dim"
        h += '<div class="%s"><span class="l fred">%s</span>%s%s</div>' % (
            cls, "ABCD"[k], HT.escape(o), " &nbsp;&#10003;" if (reveal and o == nick) else "")
    h += '</div>'
    if reveal:
        h += '<div class="abs official">%s <b>PART %s</b></div>' % (HT.escape(name), HT.escape(no))
    else:
        h += '<div class="track"></div>'
    h += '<div class="abs foot"><img src="%s" alt=""><span>piecepavilion.com</span></div></div>' % LOGO
    return h


def intro():
    return ('<div class="s red intro"><img class="mark" src="%s" alt="">'
            '<div class="abs kicker">Quiz &middot; 5 questions</div>'
            '<h1 class="abs fred">Name That LEGO Piece</h1>'
            '<div class="abs sub">4 seconds a question.<br>Keep score &mdash; results at the end.</div>'
            '<div class="abs rules"><span>&#9201; 4 sec</span><span>&#129513; 5 pieces</span><span>&#127942; Get your rank</span></div>'
            '</div>') % LOGO


def score():
    rows = "".join('<div class="row%s"><span class="n">%s</span><span class="p">%s</span><span class="r">%s</span></div>'
                   % (" top" if i == 0 else "", n, p, r) for i, (n, p, r) in enumerate(SCORE_KEY))
    return ('<div class="s red score"><img class="mark" src="%s" alt="">'
            '<h1 class="abs fred">How did you do?</h1>'
            '<div class="abs tbl">%s</div>'
            '<div class="abs cta">Comment your score &#128071;<b>Full 10-question quiz &rarr; link in bio</b></div>'
            '<div class="abs handle">@piecepavilion</div></div>') % (LOGO, rows)


def story(qi):
    nick, name, no, im, c, _ = QUESTIONS[qi]
    return ('<div class="s q story">'
            '<div class="abs kicker">Name that piece &middot; %d of %d</div>' % (qi + 1, len(QUESTIONS)) + dots(qi) +
            '<div class="abs photo"><img src="%s" alt=""></div>' % (IMG % (c, im)) +
            '<h1 class="abs fred" style="text-align:center">What&rsquo;s this piece called?</h1>'
            '<div class="abs hint">Tap your answer below &#128071;</div>'
            '<div class="abs foot"><img src="%s" alt=""><span>piecepavilion.com</span></div></div>' % LOGO)


def render(body, out_png):
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(PAGE.replace("{body}", body))
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=1", "--window-size=%d,%d" % (W, H),
                    "--virtual-time-budget=12000", "--screenshot=" + out_png,
                    "file:///" + tmp.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)
    return Image.open(out_png).convert("RGB")


def main():
    os.makedirs(FRAMES, exist_ok=True)
    print("Rendering slides with headless Chrome...")
    slides = {"intro": render(intro(), os.path.join(FRAMES, "intro.png")),
              "score": render(score(), os.path.join(FRAMES, "score.png"))}
    for qi in range(len(QUESTIONS)):
        for s in range(int(COUNT_S), 0, -1):
            slides[(qi, s)] = render(question(qi, secs=s), os.path.join(FRAMES, "q%d-%d.png" % (qi + 1, s)))
        slides[(qi, "r")] = render(question(qi, reveal=True), os.path.join(FRAMES, "q%d-reveal.png" % (qi + 1)))
        render(story(qi), os.path.join(OUT, "story-%d.png" % (qi + 1)))
    print("  %d slides + 5 story backgrounds" % len(slides))

    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    out_mp4 = os.path.join(OUT, "quiz-reel.mp4")
    proc = subprocess.Popen([ff, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                             "-preset", "medium", "-crf", "18", "-movflags", "+faststart", out_mp4],
                            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    n = [0]
    prev = [None]

    def emit(im):
        proc.stdin.write(im.tobytes()); n[0] += 1; prev[0] = im

    def cut(im):
        """Short crossfade from the previous frame into `im`, then hold is handled by caller."""
        if prev[0] is not None:
            for k in range(1, XFADE + 1):
                emit(Image.blend(prev[0], im, k / (XFADE + 1)))

    def hold(im, secs):
        for _ in range(int(secs * FPS)):
            emit(im)

    cut(slides["intro"]); hold(slides["intro"], INTRO_S)
    total_count = int(COUNT_S * FPS)
    for qi in range(len(QUESTIONS)):
        cut(slides[(qi, int(COUNT_S))])
        for f in range(total_count):
            secs_left = COUNT_S - f / FPS
            base = slides[(qi, max(1, int(secs_left) + (1 if secs_left % 1 else 0)))]
            im = base.copy()
            frac = 1.0 - f / total_count
            d = ImageDraw.Draw(im)
            d.rounded_rectangle([BAR_X, BAR_Y, BAR_X + max(BAR_H, int(BAR_W * frac)), BAR_Y + BAR_H],
                                radius=BAR_H // 2, fill=(227, 0, 11) if frac > .3 else (155, 0, 8))
            emit(im)
        cut(slides[(qi, "r")]); hold(slides[(qi, "r")], REVEAL_S)
    cut(slides["score"]); hold(slides["score"], SCORE_S)
    proc.stdin.close(); proc.wait()
    print("Reel: %d frames, %.1fs -> %s" % (n[0], n[0] / FPS, out_mp4))
    print("Story backgrounds (add the IG Quiz sticker under the question): %s\\story-1..5.png" % OUT)


if __name__ == "__main__":
    main()
