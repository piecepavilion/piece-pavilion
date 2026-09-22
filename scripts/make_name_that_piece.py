# -*- coding: utf-8 -*-
"""Generate blog/name-that-lego-piece/index.html for piecepavilion.com.

The parts list (P) is the single source of truth for the cheat-sheet cards, the
quiz pool and the live-stock badges. Edit it, then run:
    python scripts/make_name_that_piece.py
"""
import json, html, os, re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLUG = "name-that-lego-piece"
URL = "https://piecepavilion.com/blog/%s/" % SLUG
DATE_ISO = "2026-09-22"
DATE_TXT = "September 22, 2026"
TITLE = "What Is This LEGO Piece Called? 71 Part Names, Explained With Pictures"
H1 = "Name That LEGO Piece: 71 Part Names Every Builder Should Know"
DESC = ("Cheese slope, jumper plate, headlight brick, Travis brick, boat stud, SNOT: a visual cheat sheet to 71 LEGO part "
        "names with their official BrickLink names and part numbers, plus a 10-question quiz to test yourself.")
OG_DESC = "The visual cheat sheet to 71 LEGO part names (cheese slope, jumper, headlight brick and more), plus a 10-question quiz. How many can you name?"

IMG = "https://img.bricklink.com/ItemImage/PN/%s/%s.png"

# (display no, image no, color id, nickname, official BrickLink name, tip, section, in quiz pool)
P = [
 # --- hall of fame ---
 ("54200","54200","5","Cheese slope","Slope 30 1 x 1 x 2/3",
  "Looks like a wedge of cheddar. The official name is a recipe: 30&deg; angle, 1x1 footprint, two-thirds of a brick tall (two plates). Search BrickLink for 54200 and you skip the debate.","hall",True),
 ("15573","15573","86","Jumper plate","Plate, Modified 1 x 2 with 1 Stud with Groove and Bottom Stud Holder",
  "A 1x2 plate with one centered stud. It lets you &ldquo;jump&rdquo; half a stud off the grid, which is how builders center a 1x1 on a 1x2. The older version without the groove is 3794.","hall",True),
 ("4070","4070","86","Headlight brick (Erling brick)","Brick, Modified 1 x 1 with Headlight",
  "Named for Erling Dideriksen, the LEGO designer who created it in 1979. The recessed side stud held a trans-clear round plate as a car headlight, and the name stuck.","hall",True),
 ("87087","87087","5","SNOT brick","Brick, Modified 1 x 1 with Stud on Side",
  "SNOT stands for Studs Not On Top. This is the simplest way to build sideways: one extra stud facing out.","hall",True),
 ("4733","4733","86","Travis brick","Brick, Modified 1 x 1 with Studs on 4 Sides",
  "Nicknamed after fan builder Travis Kunce, who used it everywhere. Four side studs plus the top one: a cube that accepts bricks from five directions.","hall",True),
 ("2654","2654","11","Boat stud","Plate, Round 2 x 2 with Rounded Bottom (Boat Stud)",
  "The rounded underside was designed for boat hulls, hence the name. Today it is a wheel hub, a dome, a lamp shade and a hundred other things.","hall",True),
 ("98138","98138","3","Dot (round 1x1 tile)","Tile, Round 1 x 1",
  "Builders call them dots. Printed, they become minifigure eyes, coins, clock faces and cookies. Ask for a &ldquo;round tile&rdquo; and this is what you get.","hall",True),
 ("2412b","2412b","86","Grille tile","Tile, Modified 1 x 2 Grille with Bottom Groove",
  "Grille, vent, radiator, air conditioner: everyone calls it something different. BrickLink files it under Tile, Modified, so search the number.","hall",True),
 ("4081b","4081b","86","Lamp holder","Plate, Modified 1 x 1 with Light Attachment - Thick Ring",
  "A 1x1 plate with a side ring that grips a bar or a round 1x1. &ldquo;Light Attachment&rdquo; comes from its original job: holding headlights on classic Town cars.","hall",True),
 ("4599","4599b","86","Tap / faucet","Tap 1 x 1",
  "One of the shortest official names in the catalog. The a and b suffixes tell you whether the nozzle end has a hole in it.","hall",True),
 ("2877","2877","86","Profile brick","Brick, Modified 1 x 2 with Grille / Fluted Profile",
  "Not a grille in the tile sense. It is a 1x2 brick with vertical ridges, used for shutters, radiators and texture on walls.","hall",True),
 # --- basics ---
 ("3005","3005","5","1x1 brick","Brick 1 x 1",
  "The unit of height. One brick equals three plates, and almost every &ldquo;x 2/3&rdquo; or &ldquo;x 1/3&rdquo; in a part name is measured against it.","basics",False),
 ("3024","3024","5","1x1 plate","Plate 1 x 1",
  "One-third of a brick tall. Stack three and you are back to a brick.","basics",False),
 ("3070","3070","5","1x1 tile","Tile 1 x 1",
  "A plate with no stud, the same height as a plate. BrickLink dropped the old b suffix, so 3070b and 3070 are the same piece.","basics",False),
 ("3004","3004","5","1x2 brick","Brick 1 x 2",
  "Dimensions are always studs wide by studs long, so a 1x2 is one stud by two studs.","basics",False),
 ("3023","3023","5","1x2 plate","Plate 1 x 2",
  "Consistently one of the most-produced LEGO elements ever. If you own a bin of bulk, you own hundreds of these.","basics",False),
 ("3069","3069","5","1x2 tile","Tile 1 x 2",
  "Smooth top, same footprint as the 1x2 plate. Used for floors, roads and anywhere you want to hide studs.","basics",False),
 ("3001","3001","5","2x4 brick","Brick 2 x 4",
  "The brick. Element 3001 is the one on every logo, every lawsuit and every childhood.","basics",False),
 # --- slopes ---
 ("3040","3040","5","45&deg; roof slope","Slope 45 2 x 1",
  "The number after Slope is the angle. BrickLink lists slopes length-first, so this is a 2 x 1, not a 1 x 2.","slopes",False),
 ("3039","3039","5","45&deg; slope 2x2","Slope 45 2 x 2",
  "Same angle, twice as wide. The 45s are the classic pitched-roof bricks.","slopes",False),
 ("3298","3298","5","33&deg; slope 3x2","Slope 33 3 x 2",
  "The shallower roof. Three studs deep, so it climbs one brick over three studs.","slopes",False),
 ("4286","4286","5","33&deg; slope 3x1","Slope 33 3 x 1",
  "The narrow 33. Read the name as angle, then length, then width.","slopes",True),
 ("3665","3665","5","Inverted slope","Slope, Inverted 45 2 x 1",
  "An upside-down slope with studs on top. Used for hulls, wings, and any undercut that has to hold a brick above it.","slopes",True),
 ("3747b","3747b","5","Inverted 33 slope","Slope, Inverted 33 3 x 2",
  "The inverted version of the 33 roof. The b suffix marks the current mold with a connecting groove underneath.","slopes",False),
 ("85984","85984","5","Double cheese","Slope 30 1 x 2 x 2/3",
  "A cheese slope two studs wide. Same 30&deg; angle, same two-plate height, so the two mix on a roofline.","slopes",True),
 ("11477","11477","5","Curved slope","Slope, Curved 2 x 1 x 2/3",
  "The workhorse of modern LEGO. If a set looks smooth and streamlined, it is covered in these.","slopes",True),
 ("15068","15068","5","Curved slope 2x2","Slope, Curved 2 x 2 x 2/3",
  "The wide version. Car hoods, boat bows and dozens of shoulder pads on big figures.","slopes",False),
 ("3045","3045","5","Roof corner","Slope 45 2 x 2 Double Convex",
  "The outside corner of a hip roof. Its partner, Double Concave (3046), is the inside corner.","slopes",True),
 # --- SNOT toolbox ---
 ("99780","99780","86","Inverted bracket","Bracket 1 x 2 - 1 x 2 Inverted",
  "An L-shaped plate that turns studs 90&deg;. Inverted means the side plate hangs down below the top plate.","snot",True),
 ("99781","99781","86","Bracket","Bracket 1 x 2 - 1 x 2",
  "Same L, with the side plate rising above. Between them, these two brackets are the backbone of sideways building.","snot",False),
 ("32028","32028","86","Door rail plate","Plate, Modified 1 x 2 with Door Rail",
  "The groove takes a sliding door or the edge of a tile. Also the cheapest way to add a thin ledge to a wall.","snot",True),
 ("3839b","3839b","86","Handle plate","Plate, Modified 1 x 2 with Bar Handles - Flat Ends",
  "Two bars on the side for clips to grab. The older round-ended version is 3839a; both are still sold.","snot",True),
 ("60470b","60470b","86","Double clip plate","Plate, Modified 1 x 2 with Clips Horizontal (thick open O clips)",
  "Two horizontal clips. Pair it with a handle plate or a bar and you have a hinge.","snot",False),
 ("4085d","4085d","86","Vertical clip","Plate, Modified 1 x 1 with Clip Vertical",
  "The suffix letter tracks mold revisions: a, b, c, d. The d has the reinforced clip and is what you receive today.","snot",False),
 ("61252","61252","86","O-clip","Plate, Modified 1 x 1 with Open O Clip Horizontal",
  "Open O means the clip is a ring with a gap that wraps a bar sideways. It grips harder than the older U-shaped clip.","snot",False),
 ("30414","30414","5","1x4 SNOT brick","Brick, Modified 1 x 4 with 4 Studs on Side",
  "Four side studs in a row. Attach tiles to them and you have an instant smooth wall.","snot",True),
 ("3937","3937","5","Hinge base","Hinge Brick 1 x 2 Base",
  "The bottom half of the classic click hinge. Useless on its own, which is why bulk lots are full of them.","snot",False),
 ("3938","3938","5","Hinge top","Hinge Brick 1 x 2 Top Plate",
  "Snaps into 3937 to make a hinged lid, ramp or wing. Old instructions call the pair a hinge brick.","snot",False),
 ("3176","3176","86","Coupling plate","Plate, Modified 3 x 2 with Hole",
  "The hole takes a pin, a bar or a tow hitch. This is the trailer coupling from a generation of Town trucks.","snot",True),
 ("2540","2540","86","Side handle plate","Plate, Modified 1 x 2 with Bar Handle on Side - Free Ends",
  "One bar sticking out sideways. The one you grab when a minifigure needs to hang off a ledge.","snot",False),
 # --- technic ---
 ("2780","2780","11","Black pin","Technic, Pin with Friction Ridges Lengthwise and Center Slots",
  "Black means friction: it stays where you put it. The single most common Technic part in existence.","technic",True),
 ("3673","3673","86","Gray pin","Technic, Pin without Friction Ridges Lengthwise",
  "Light gray means no friction: it spins freely. That is the whole code. Black grips, gray spins.","technic",False),
 ("6558","6558","7","Long blue pin","Technic, Pin 3L with Friction Ridges Lengthwise",
  "3L means three modules long. Blue is the friction color for long pins.","technic",False),
 ("43093","43093","7","Axle pin","Technic, Axle 1L with Pin with Friction Ridges Lengthwise",
  "Half pin, half axle. It joins a round beam hole to a cross-shaped axle hole, which is why gears are always sitting on one.","technic",True),
 ("4274","4274","86","Half pin","Technic, Pin 1/2",
  "A pin on one end and a hollow stud on the other. This is how Technic and regular bricks talk to each other.","technic",False),
 ("32062","32062","5","Red 2L axle","Technic, Axle 2L Notched",
  "Axles are the cross-shaped rods and the L is their length in studs. The notch marks the modern version of the 2-long.","technic",False),
 ("3713","3713","86","Bushing","Technic, Bush",
  "Slides onto an axle to hold a wheel or gear in place. The full bush is one stud tall.","technic",True),
 ("4265c","4265c","86","Half bush","Technic, Bush 1/2 Smooth",
  "Half the height of a bush. The c is a mold revision; older versions had ridges around the outside.","technic",False),
 ("3648","3648","86","24-tooth gear","Technic, Gear 24 Tooth",
  "The tooth count is the name. Standard gears come in 8, 16, 24 and 40, so count the teeth and you have the part.","technic",False),
 ("32073","32073","86","5L axle","Technic, Axle 5L",
  "Odd-length axles (3, 5, 7) are gray and even lengths (4, 6, 8) are black. That color code is why you can sort axles by eye.","technic",False),
 ("3700","3700","5","Technic brick 1x2","Technic, Brick 1 x 2 with Hole",
  "A regular brick with a pin hole through it. Technic bricks predate Technic beams by decades.","technic",False),
 ("6541","6541","5","Technic brick 1x1","Technic, Brick 1 x 1 with Hole",
  "The one-stud version. A pin through it makes a spinning axle for propellers and doors.","technic",False),
 ("32064","32064","5","Axle-hole brick","Technic, Brick 1 x 2 with Axle Hole",
  "Same brick, but the hole is cross-shaped for an axle instead of round for a pin.","technic",False),
 # --- round ---
 ("3062b","3062","5","1x1 round brick","Brick, Round 1 x 1 Open Stud",
  "Open Stud means the top stud is hollow, so a bar fits in it. Torches, columns and lamp posts start here.","round",True),
 ("4073","4073","5","1x1 round plate","Plate, Round 1 x 1",
  "A dot with a stud. In transparent colors these are lights, gems and potion drops.","round",False),
 ("4589b","4589b","5","1x1 cone","Cone 1 x 1 with Top Groove",
  "The groove lets a clip or bar hold it. Rocket nozzles, ice cream cones and lamp shades.","round",False),
 ("3941","3941","5","2x2 round brick","Brick, Round 2 x 2 with Axle Hole",
  "The axle hole underneath gives it the name and lets it spin on a Technic axle.","round",True),
 ("14769","14769","5","2x2 round tile","Tile, Round 2 x 2 with Bottom Stud Holder",
  "Replaced the old 4150 in 2013 with a stud holder underneath so it centers on a single stud. Printed versions are clocks, coins and manhole covers.","round",True),
 ("3960","3960","86","Radar dish 4x4","Dish 4 x 4 Inverted (Radar)",
  "Inverted means the concave side faces up when placed on studs. Radar has been in the name since Classic Space.","round",True),
 ("4740","4740","86","Radar dish 2x2","Dish 2 x 2 Inverted (Radar)",
  "The small one. Shields, hubcaps and umbrella tops.","round",False),
 ("3957b","3957b","11","Antenna","Antenna 1 x 4 - Flat Top",
  "Read 1 x 4 as one stud wide and four bricks tall. It is one of the few common parts where the second number is height.","round",True),
 ("30374","30374","12","Lightsaber blade","Bar 4L (Lightsaber Blade / Wand)",
  "Officially a 4-module bar. Star Wars fans said lightsaber blade so often that BrickLink put it in the name.","round",True),
 # --- minifig ---
 ("3626","3626pb1965","3","Minifigure head","Minifigure, Head",
  "Every standard head is 3626 plus a print code. The letter after the number tracks the stud style; c is the modern hollow stud.","minifig",False),
 ("970c00","970c00","7","Legs","Hips and Legs",
  "970 is the hip piece and c00 means it is assembled with plain legs. Printed legs get a different suffix.","minifig",False),
 ("3901","3901","11","Classic hair","Minifigure, Hair Male",
  "The original 1979 hairpiece. Still in production and still in every bulk lot on earth.","minifig",False),
 ("3899","3899","1","Mug","Minifigure, Utensil Cup",
  "A cup with a handle. Not the goblet, which has a stem.","minifig",False),
 ("2343","2343","12","Goblet","Minifigure, Utensil Goblet",
  "The stemmed glass. Its hollow stem takes a bar, so it doubles as a potion bottle, a trophy or a lamp.","minifig",False),
 ("3959","3959","11","Space gun / torch","Minifigure, Utensil Space Gun / Torch",
  "The Classic Space blaster from 1979, or a flashlight, depending on the theme. Same mold ever since.","minifig",False),
 ("30162","30162","11","Binoculars","Minifigure, Utensil Binoculars",
  "Also a pair of headlights or exhaust pipes when you turn it around. Fits any clip.","minifig",False),
 ("3962b","3962b","11","Walkie-talkie","Minifigure, Utensil Radio",
  "Walkie-talkie to everyone except the catalog, which insists on Radio.","minifig",False),
 ("3847","3847","95","Shortsword","Minifigure, Weapon Sword, Shortsword",
  "The Castle-era sword. BrickLink lists weapons as Weapon, then the type, so search sword rather than shortsword.","minifig",False),
]
assert len(P) == 71, len(P)

SECTIONS = [
 ("hall","The nickname hall of fame",
  "These are the pieces with names nobody says out loud. Builders use the nickname, the catalog uses the official name, and searching for the wrong one gets you nothing. Learn these eleven and you can read almost any parts list."),
 ("basics","Brick, plate, tile: the height rule",
  "Three words cover most of a bulk bin. A <strong>brick</strong> is the unit of height. A <strong>plate</strong> is one-third of a brick. A <strong>tile</strong> is a plate with no stud on top. Dimensions are always studs wide by studs long, and when a part is not a whole brick tall the name adds a height, so <em>1 x 1 x 2/3</em> means one stud by one stud, two plates tall."),
 ("slopes","Slopes: the numbers are angles",
  "The number after Slope is the angle in degrees. 45 is the classic steep roof, 33 is the shallow roof, 30 is the cheese family and Curved has no angle at all. <strong>Inverted</strong> means the slope faces down with studs on top."),
 ("snot","Brackets, clips and modified plates: the SNOT toolbox",
  "SNOT stands for <em>Studs Not On Top</em>, and every piece here exists to point a stud sideways or grab a bar. In the catalog they all live under <strong>Plate, Modified</strong> or <strong>Bracket</strong>, which is why searching by name is hopeless and searching by number works."),
 ("technic","Technic: pins, axles and the color code",
  "Technic names look intimidating but follow one rule: the part type, then its length in modules (the <strong>L</strong>), then whether it has friction ridges. The colors are not decoration. LEGO color-codes pins and axles so you can sort them by eye."),
 ("round","Round parts, cones and dishes",
  "Round is its own family in the catalog: <strong>Brick, Round</strong>, <strong>Plate, Round</strong>, <strong>Tile, Round</strong>, plus Cone, Dish and Bar. The words after the size describe what the underside or the top can hold."),
 ("minifig","Minifigure parts and accessories",
  "Minifigure parts start with <strong>Minifigure,</strong> then the body part or <strong>Utensil</strong>, then a description. Accessories are where nicknames and catalog names drift furthest apart."),
]

def esc(s): return html.escape(s, quote=True)

def card(p):
    no, img, col, nick, name, tip, sec, quiz = p
    alt = esc(re.sub(r"&[a-z]+;", "", nick)) + " LEGO piece, part " + no
    return f'''      <div class="pn-card" data-no="{esc(no)}">
        <img src="{IMG % (col, img)}" alt="{alt}" loading="lazy" width="120" height="110" />
        <div class="pn-nick">{nick}</div>
        <div class="pn-name">{esc(name)}</div>
        <div class="pn-no">Part {esc(no)}</div>
        <p class="pn-tip">{tip}</p>
        <div class="pn-links"><a class="pn-find" href="/finder/?q={esc(no)}">Find it in our store &rarr;</a><span class="pn-stock" data-stock="{esc(no)}"></span></div>
      </div>'''

def section(key, title, blurb):
    cards = "\n".join(card(p) for p in P if p[6] == key)
    n = sum(1 for p in P if p[6] == key)
    return f'''
    <h2 id="{key}">{title}</h2>
    <p>{blurb}</p>
    <div class="pn-grid" aria-label="{esc(re.sub('<[^>]+>','',title))}: {n} pieces">
{cards}
    </div>'''

# JSON for quiz + stock badges (strip HTML entities from nick for share/quiz text)
def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).replace("\u00a0"," ")
DATA = [{"no":no,"img":IMG % (col,img),"nick":plain(nick),"name":name,"sec":sec,"q":quiz} for no,img,col,nick,name,tip,sec,quiz in P]
DATA_JSON = json.dumps(DATA, ensure_ascii=False).replace("</", "<\\/")
QUIZ_N = sum(1 for d in DATA if d["q"])

FAQ = [
 ("What is a LEGO cheese slope?",
  "A cheese slope is the nickname for LEGO part 54200, officially Slope 30 1 x 1 x 2/3. It is a one-stud wedge, two plates tall, with a 30-degree face, and it looks like a small wedge of cheese. The two-stud-wide version (85984) is often called a double cheese."),
 ("What is a jumper plate in LEGO?",
  "A jumper plate is a 1 x 2 plate with a single stud in the center, part 15573 (older version 3794). It lets builders shift a piece half a stud off the normal grid, which is why it is called a jumper."),
 ("What is a LEGO headlight brick or Erling brick?",
  "The headlight brick, part 4070, is officially Brick, Modified 1 x 1 with Headlight. It has a recessed stud on one side and was designed in 1979 by LEGO designer Erling Dideriksen to hold a transparent round plate as a car headlight, which is where both nicknames come from."),
 ("What is the difference between a LEGO brick, plate and tile?",
  "A brick is the standard unit of height. A plate is one-third the height of a brick, so three plates stacked equal one brick. A tile is a plate with a smooth top and no stud. Part names give the footprint in studs first, so a 1 x 2 plate is one stud wide by two studs long."),
 ("What does SNOT mean in LEGO building?",
  "SNOT stands for Studs Not On Top. It describes any technique that points studs sideways or downward, using parts like the 1 x 1 brick with a stud on the side (87087), the headlight brick (4070), brackets (99780 and 99781) and the Travis brick (4733)."),
 ("How do I find out what a LEGO piece is called?",
  "Look for the tiny part number molded on the inside or underside of the piece, then search that number in the BrickLink catalog or in the Piece Pavilion Product Finder. If you cannot read a number, photograph the piece with a part-recognition app such as Brickognize, or browse the BrickLink catalog by category (Brick, Plate, Slope, Tile) and shape."),
]
faq_json = json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in FAQ]}, indent=2, ensure_ascii=False)

def faq_html():
    out = []
    for q,a in FAQ:
        out.append(f"    <h3>{esc(q)}</h3>\n    <p>{esc(a)}</p>")
    return "\n".join(out)

sections_html = "\n".join(section(k,t,b) for k,t,b in SECTIONS)
toc = " &middot; ".join(f'<a href="#{k}">{re.sub("<[^>]+>","",t).split(":")[0]}</a>' for k,t,_ in SECTIONS)

PAGE = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(TITLE)} | Piece Pavilion</title>
  <meta name="description" content="{esc(DESC)}" />
  <link rel="canonical" href="{URL}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{URL}" />
  <meta property="og:title" content="Name That LEGO Piece: 71 Part Names, Explained With Pictures" />
  <meta property="og:description" content="{esc(OG_DESC)}" />
  <meta property="og:image" content="https://piecepavilion.com/og/{SLUG}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://piecepavilion.com/og/{SLUG}.png" />
  <meta name="twitter:title" content="Name That LEGO Piece: 71 Part Names, Explained With Pictures" />
  <meta name="twitter:description" content="{esc(OG_DESC)}" />

  <!-- Structured Data -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "image": "https://piecepavilion.com/og/{SLUG}.png",
    "headline": "{esc(TITLE)}",
    "description": "{esc(DESC)}",
    "datePublished": "{DATE_ISO}",
    "dateModified": "{DATE_ISO}",
    "author": {{ "@type": "Organization", "name": "Piece Pavilion", "url": "https://piecepavilion.com" }},
    "publisher": {{ "@type": "Organization", "name": "Piece Pavilion", "url": "https://piecepavilion.com" }},
    "mainEntityOfPage": "{URL}"
  }}
  </script>
  <script type="application/ld+json">
{faq_json}
  </script>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://piecepavilion.com/" }},
      {{ "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://piecepavilion.com/blog/" }},
      {{ "@type": "ListItem", "position": 3, "name": "Name That LEGO Piece", "item": "{URL}" }}
    ]
  }}
  </script>

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-X3DK777DPM"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-X3DK777DPM');
  </script>

  <link rel="stylesheet" href="../../style.css" />
  <link rel="stylesheet" href="../blog.css" />
  <!-- Favicon / tab identity -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/logo-white.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#e3000b" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://img.bricklink.com" />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

  <style>
    /* ---- Post-specific: part-name cheat sheet ---- */
    .pn-toc {{ font-size: .9rem; color: var(--mid); background: var(--cream); border-radius: var(--radius); padding: 12px 16px; margin: 18px 0 8px; line-height: 1.7; }}
    .pn-toc a {{ color: var(--red); font-weight: 700; text-decoration: none; }}
    .pn-toc a:hover {{ text-decoration: underline; }}
    .pn-toc .pn-toc-quiz {{ display:inline-block; margin-left: 6px; background: var(--red); color:#fff; border-radius: 999px; padding: 2px 10px; }}
    .pn-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; margin: 18px 0 10px; }}
    .pn-card {{ background: #fff; border: 1px solid #e5e7eb; border-radius: var(--radius); padding: 14px 14px 12px; display: flex; flex-direction: column; box-shadow: var(--shadow-sm); }}
    .pn-card img {{ width: 100%; height: 110px; object-fit: contain; display: block; margin-bottom: 10px; background: #fff; }}
    .pn-nick {{ font-family: 'Fredoka', 'Nunito', sans-serif; font-weight: 700; font-size: 1.08rem; color: var(--dark); line-height: 1.2; }}
    .pn-name {{ font-size: .8rem; color: var(--mid); margin: 4px 0 4px; line-height: 1.35; }}
    .pn-no {{ font-size: .7rem; font-weight: 800; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }}
    .pn-tip {{ font-size: .85rem; color: var(--slate); line-height: 1.45; margin: 8px 0 10px; flex: 1; }}
    .pn-links {{ display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: .78rem; }}
    .pn-find {{ font-weight: 800; color: var(--red); text-decoration: none; }}
    .pn-find:hover {{ text-decoration: underline; }}
    .pn-stock {{ display: none; background: #e8f7ed; color: #146a2e; border-radius: 999px; padding: 2px 9px; font-weight: 800; font-size: .7rem; white-space: nowrap; }}
    .pn-stock.on {{ display: inline-block; }}
    .pn-note {{ font-size: .82rem; color: var(--muted); margin: 6px 0 0; }}

    /* ---- Quiz ---- */
    .quiz {{ background: radial-gradient(circle at 1.6px 1.6px, rgba(255,255,255,.05) 1.6px, transparent 1.7px) 0 0/26px 26px, linear-gradient(135deg,#15151f 0%,#241016 55%,#2c0c0c 100%); color: #fff; border-radius: var(--radius-lg); padding: 30px 26px 26px; margin: 40px 0 8px; clear: both; box-shadow: var(--shadow-lg); }}
    .quiz-kicker {{ display: inline-block; font-size: .72rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: var(--yellow); margin-bottom: 8px; }}
    .quiz h2 {{ color: #fff; border: 0; padding: 0; margin: 0 0 8px; font-family: 'Fredoka','Nunito',sans-serif; font-size: 1.7rem; }}
    .quiz p {{ color: rgba(255,255,255,.85); margin: 0 0 16px; }}
    .quiz-progress {{ display: flex; gap: 5px; margin: 0 0 18px; }}
    .quiz-progress span {{ flex: 1; height: 6px; border-radius: 999px; background: rgba(255,255,255,.18); }}
    .quiz-progress span.right {{ background: #3c9e4f; }}
    .quiz-progress span.wrong {{ background: var(--red); }}
    .quiz-progress span.now {{ background: var(--yellow); }}
    .quiz-img {{ background: #fff; border-radius: var(--radius); width: 100%; max-width: 260px; height: 190px; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; padding: 14px; }}
    .quiz-img img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
    .quiz-q {{ text-align: center; font-weight: 800; font-size: 1.05rem; margin: 0 0 14px; }}
    .quiz-opts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
    .quiz-opt {{ font: inherit; font-weight: 700; font-size: .9rem; text-align: left; line-height: 1.3; color: #fff; background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.18); border-radius: var(--radius); padding: 12px 14px; cursor: pointer; transition: background .15s, border-color .15s, transform .1s; }}
    .quiz-opt:hover:not(:disabled) {{ background: rgba(255,255,255,.16); border-color: rgba(255,255,255,.4); transform: translateY(-1px); }}
    .quiz-opt:disabled {{ cursor: default; opacity: .7; }}
    .quiz-opt.right {{ background: #1f6f33; border-color: #3c9e4f; opacity: 1; }}
    .quiz-opt.wrong {{ background: #7a1010; border-color: var(--red); opacity: 1; }}
    .quiz-reveal {{ margin-top: 16px; background: rgba(255,255,255,.08); border-radius: var(--radius); padding: 14px 16px; font-size: .92rem; line-height: 1.5; }}
    .quiz-reveal strong {{ color: var(--yellow); }}
    .quiz-reveal a {{ color: #fff; font-weight: 800; }}
    .quiz-actions {{ display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 18px; }}
    .quiz-btn {{ font: inherit; font-weight: 800; font-size: .95rem; border: 0; border-radius: 999px; padding: 12px 24px; cursor: pointer; background: var(--red); color: #fff; box-shadow: var(--shadow-red); text-decoration: none; display: inline-block; }}
    .quiz-btn:hover {{ background: var(--red-dark); }}
    .quiz-btn.ghost {{ background: transparent; border: 2px solid rgba(255,255,255,.4); box-shadow: none; }}
    .quiz-btn.ghost:hover {{ background: rgba(255,255,255,.1); }}
    .quiz-score {{ text-align: center; }}
    .quiz-score .big {{ font-family: 'Fredoka','Nunito',sans-serif; font-size: 3.4rem; font-weight: 700; line-height: 1; color: var(--yellow); margin: 6px 0 4px; }}
    .quiz-score .rank {{ font-size: 1.25rem; font-weight: 800; margin-bottom: 6px; }}
    .quiz-score .sub {{ color: rgba(255,255,255,.8); }}
    .quiz-share-note {{ font-size: .82rem; color: rgba(255,255,255,.7); margin-top: 14px; }}
    .quiz-share-note a {{ color: #fff; font-weight: 800; }}
    .quiz-copied {{ display: none; font-size: .85rem; color: var(--yellow); font-weight: 800; margin-top: 10px; text-align: center; }}
    .quiz-copied.on {{ display: block; }}
    @media (max-width: 520px) {{
      .quiz {{ padding: 22px 16px 20px; }}
      .quiz-opts {{ grid-template-columns: 1fr; }}
      .pn-grid {{ grid-template-columns: repeat(2, 1fr); gap: 10px; }}
      .pn-card {{ padding: 10px; }}
      .pn-card img {{ height: 84px; }}
      .pn-nick {{ font-size: .95rem; }}
    }}
  </style>
</head>
<body>

  <!-- ===== SIDEBAR OVERLAY ===== -->
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <!-- ===== LEFT SIDEBAR NAV ===== -->
  <nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <a href="/" class="sidebar-logo">
        <img src="../../logo-white.png" alt="Piece Pavilion" class="logo-img" />
      </a>
      <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">&times;</button>
    </div>
    <ul class="sidebar-links">
      <li><a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">Shop Now</a></li>
      <li><a href="/#shop">What We Carry</a></li>
      <li><a href="/lego-minifigures/">LEGO Minifigures</a></li>
      <li><a href="/lego-star-wars-minifigures/">Star Wars Minifigures</a></li>
      <li><a href="/retired-lego-sets/">Retired Sets</a></li>
      <li><a href="/#featured">Featured Pieces</a></li>
      <li><a href="/#about">About Us</a></li>
      <li><a href="/#why">Why Shop With Us</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/#instagram">Instagram</a></li>
      <li><a href="/#sell">Sell or Consign</a></li>
      <li><a href="/#contact">Get in Touch</a></li>
      <li class="sidebar-bricklink">
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="btn-nav">
          BrickLink Store &rarr;
        </a>
      </li>
    </ul>
  </nav>

  <!-- ===== MAIN CONTENT ===== -->
  <div class="main-content">

  <!-- ===== ANNOUNCEMENT BANNER ===== -->
  <div class="announcement-banner">
    <a class="announcement-text" href="/blog/">
      <strong>&#128276; New on the Blog</strong>
      <span>Read the latest &rarr;</span>
    </a>
    <button class="announcement-close" aria-label="Dismiss">&times;</button>
  </div>
  <div class="lightbox" id="flyer-lightbox">
    <button class="lightbox-close" aria-label="Close">&times;</button>
    <img src="" alt="Sale Flyer" class="lightbox-img" />
  </div>

  <!-- ===== STICKY HEADER ===== -->
  <header class="site-header" id="site-header">
    <div class="header-inner">
      <a href="/" class="header-brand" aria-label="Piece Pavilion home">
        <span class="brand-mark" aria-hidden="true"><img src="/logo-white.png" alt="Piece Pavilion" /></span>
        <span class="brand-word">Piece&#8203;Pavilion</span>
      </a>
      <nav class="header-nav">
        <div class="nav-dropdown">
          <a href="/#shop" class="nav-dropdown-toggle">Shop <span class="caret">&#9662;</span></a>
          <div class="nav-dropdown-menu">
            <a href="/lego-minifigures/">LEGO Minifigures</a>
            <a href="/lego-star-wars-minifigures/">Star Wars Minifigures</a>
            <a href="/retired-lego-sets/">Retired Sets</a>
            <a href="/#shop">What We Carry</a>
            <a class="nav-dropdown-all" href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop" target="_blank" rel="noopener">All Products on BrickLink &rarr;</a>
          </div>
        </div>
        <a href="/#featured">Featured</a>
        <a href="/#about">About</a>
        <a href="/blog/">Blog <span class="nav-new">New</span></a>
        <a href="/#sell">Sell</a>
      </nav>
      <div class="header-actions">
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="header-rating"
           aria-label="100% positive feedback">
          <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 100%
        </a>
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener" class="btn-primary header-shop">Shop Now &rarr;</a>
        <button class="header-burger" id="header-burger" aria-label="Open menu">&#9776;</button>
      </div>
    </div>
  </header>

  <!-- ===== BREADCRUMBS ===== -->
  <div class="breadcrumbs">
    <nav>
      <a href="/">Home</a>
      <span class="sep">&rsaquo;</span>
      <a href="/blog/">Blog</a>
      <span class="sep">&rsaquo;</span>
      Name That LEGO Piece
    </nav>
  </div>

  <!-- ===== ARTICLE ===== -->
  <article class="blog-article">
    <h1>{H1}</h1>
    <p class="blog-byline">Piece Pavilion &middot; {DATE_TXT}</p>

    <img class="blog-hero" src="/og/{SLUG}.png?v=1" alt="Name That LEGO Piece: a visual guide to LEGO part names from Piece Pavilion" width="1200" height="630" />

    <p>Every LEGO builder has done it. You hold up a piece, you know exactly what it does, and you have no idea what to call it. So you type &ldquo;the little wedge thing&rdquo; into a search box and get nothing. Or you ask a friend for a <em>cheese slope</em> and they hand you a Brick, Modified 1 x 1 with Headlight, because that is what <em>their</em> friend called it.</p>

    <p>Names matter more than they used to. Buying single pieces on <a href="/blog/how-to-buy-lego-on-bricklink/">BrickLink</a>, sorting a <a href="/blog/spotting-valuable-lego-bulk-lots/">bulk lot</a>, following a fan build online: all of it runs on part names and numbers. So we pulled the <strong>71 pieces people ask us about most</strong>, put the nickname next to the official BrickLink name, and added the one thing you actually need: the part number that makes every search work.</p>

    <p>Read it as a cheat sheet, then scroll to the bottom and <a href="#quiz">take the quiz</a>. Ten pieces, four names each. Post your score and tag <a href="https://www.instagram.com/piecepavilion" target="_blank" rel="noopener">@piecepavilion</a>; we want to see who can beat the shop.</p>

    <div class="pn-toc">Jump to: {toc} <a class="pn-toc-quiz" href="#quiz">Take the quiz &rarr;</a></div>

    <h2>How to read a LEGO part name</h2>

    <p>Official names look like gibberish until you see the pattern. The BrickLink catalog, which the whole secondhand market runs on, names every piece the same way:</p>

    <ol>
      <li><strong>The family first.</strong> Brick, Plate, Tile, Slope, Bracket, Technic, Minifigure. A comma after it means a sub-family: <em>Plate, Modified</em> or <em>Slope, Curved</em>.</li>
      <li><strong>Then the size in studs.</strong> Width by length. When the part is not a whole brick tall, a third number gives the height in bricks, so <em>x 2/3</em> is two plates tall and <em>x 1/3</em> is one plate.</li>
      <li><strong>Then what makes it special.</strong> &ldquo;with Stud on Side,&rdquo; &ldquo;with Clip Vertical,&rdquo; &ldquo;Inverted,&rdquo; &ldquo;with Axle Hole.&rdquo;</li>
      <li><strong>The part number is molded on the piece.</strong> Look inside a brick or under a plate for tiny raised digits. A letter after the number (3070b, 4085d) marks a mold revision, and BrickLink sometimes drops it when the old version is retired.</li>
    </ol>

    <p>Once you can read one name, you can read all of them. Every card below gives you the nickname, the official name, the number, and a live link to check whether we have it in stock.</p>
{sections_html}

    <p class="pn-note">Stock badges load from our live inventory, which updates every hour. No badge means we are sold out at the moment, but the search still works and restocks are constant.</p>

    <h2>Still can&rsquo;t identify a piece? Four ways to look it up</h2>

    <ol>
      <li><strong>Read the number off the part.</strong> Tilt it under a lamp. Most pieces made since the 1980s carry a four- or five-digit mold number inside or underneath. Type it into our <a href="/finder/">Product Finder</a> or the BrickLink catalog search.</li>
      <li><strong>Photograph it.</strong> Free part-recognition tools such as Brickognize identify a piece from a phone photo with surprising accuracy and hand you the BrickLink number.</li>
      <li><strong>Browse by shape.</strong> The BrickLink catalog is organized by the same families as this guide. If you know it is a slope, open Slope and scan the pictures.</li>
      <li><strong>Ask us.</strong> Send a photo through our <a href="/#contact">contact form</a> or Instagram DMs. Identifying odd pieces is half our job, and we like doing it.</li>
    </ol>

    <p>If the name turns out to be worth knowing because the piece is worth something, our guide to <a href="/blog/how-much-is-your-lego-worth/">how much your LEGO is worth</a> is the next stop. And if the problem is not one piece but a whole bin of them, start with our <a href="/blog/lego-sorting-and-organizing-tips/">sorting and organizing tips</a>.</p>

    <!-- ===== QUIZ ===== -->
    <section class="quiz" id="quiz" aria-live="polite">
      <span class="quiz-kicker">The quiz</span>
      <h2>Name That LEGO Piece</h2>
      <div id="quiz-body">
        <p>Ten pieces from the cheat sheet above, four official names each. No scrolling up. Score 10 and you are ready to run a BrickLink store.</p>
        <div class="quiz-actions"><button class="quiz-btn" type="button" id="quiz-start">Start the quiz &rarr;</button></div>
      </div>
    </section>

    <h2>Frequently asked questions</h2>
{faq_html()}

    <p class="blog-byline" style="border-bottom:0;margin-top:32px;font-weight:600;">LEGO&reg; is a trademark of the LEGO Group, which does not sponsor, authorize, or endorse this site. Piece Pavilion is an independent reseller. Part names and numbers follow the BrickLink catalog; nicknames are community usage and vary. Product images courtesy of BrickLink.</p>

    <!-- ===== CTA ===== -->
    <div class="blog-cta">
      <h3>Now you know the name. Here is the piece.</h3>
      <p>Search our live inventory of thousands of hand-inspected LEGO parts by name or number. Most of the pieces on this page are in stock today.</p>
      <a href="/finder/" class="btn-primary btn-large">Open the Product Finder &rarr;</a>
    </div>
  </article>

  <!-- ===== MORE POSTS ===== -->
  <section class="more-posts">
    <h2>More From the Blog</h2>
    <div class="blog-cards">
      <a href="/blog/lego-sorting-and-organizing-tips/" class="blog-card">
        <div class="blog-card-thumb"><img src="/thumb/lego-sorting-and-organizing-tips.png?v=3" alt="" loading="lazy" /></div>
        <div class="blog-card-body">
          <span class="blog-card-date">March 11, 2026</span>
          <h2>5 Tips for Sorting and Organizing Your LEGO Collection</h2>
          <p>Whether you have a bin of mixed bricks or shelves of sets, these sorting strategies will save you time and help you build faster.</p>
          <span class="blog-card-link">Read More &rarr;</span>
        </div>
      </a>
      <a href="/blog/spotting-valuable-lego-bulk-lots/" class="blog-card">
        <div class="blog-card-thumb"><img src="/thumb/spotting-valuable-lego-bulk-lots.png?v=3" alt="" loading="lazy" /></div>
        <div class="blog-card-body">
          <span class="blog-card-date">June 26, 2026</span>
          <h2>How to Spot the Valuable Pieces in a Bulk LEGO Lot</h2>
          <p>Most of a bulk lot is filler — the value hides in a few items. How to find the minifigures, accessories, printed and rare-color parts, and retired set pieces worth real money.</p>
          <span class="blog-card-link">Read More &rarr;</span>
        </div>
      </a>
    </div>
  </section>

  <!-- ===== NEWSLETTER (wired to Kit form 9514041) ===== -->
  <section class="newsletter section" id="newsletter">
    <div class="container newsletter-inner">
      <div class="newsletter-copy">
        <h2>Never miss a brick drop</h2>
        <p>New inventory, restocks, and subscriber-only deals — straight to your inbox.</p>
      </div>
      <form class="newsletter-form seva-form formkit-form"
            action="https://app.kit.com/forms/9514041/subscriptions" method="post"
            data-sv-form="9514041" data-uid="42e73e4009" data-format="inline" data-version="5">
        <label class="visually-hidden" for="nl-email">Email address</label>
        <input id="nl-email" class="formkit-input" type="email" name="email_address" required placeholder="you@email.com" autocomplete="email" aria-label="Email address" />
        <button type="submit" class="btn-primary" data-element="submit">Subscribe &rarr;</button>
        <ul class="formkit-alert formkit-alert-error" data-element="errors" data-group="alert"></ul>
        <p class="newsletter-note">No spam — just drops and deals. Unsubscribe anytime.</p>
      </form>
    </div>
  </section>

  <!-- ===== FOOTER ===== -->
  <footer class="footer">
    <div class="container footer-inner">
      <a href="/" class="logo logo-footer">
        <img src="../../logo-white.png" alt="Piece Pavilion" class="logo-img logo-img-footer" />
      </a>
      <p class="footer-tagline">Where every piece finds its place.</p>
      <nav class="footer-links">
        <a href="/#shop">Shop</a>
        <a href="/#featured">Featured</a>
        <a href="/#about">About Us</a>
        <a href="/#why">Why Us</a>
        <a href="/blog/">Blog</a>
        <a href="/#sell">Sell / Consign</a>
        <a href="/#contact">Contact</a>
        <a href="https://store.bricklink.com/PiecePavilion?p=PiecePavilion#/shop"
           target="_blank" rel="noopener">BrickLink Store</a>
        <a href="/employees/" rel="noopener">Staff</a>
      </nav>
      <div class="footer-social">
        <a href="https://www.instagram.com/piecepavilion" target="_blank" rel="noopener" aria-label="Instagram">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 0 1 1.47.957c.453.453.764.898.957 1.47.163.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 0 1-.957 1.47 4.088 4.088 0 0 1-1.47.957c-.46.163-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 0 1-1.47-.957 4.088 4.088 0 0 1-.957-1.47c-.163-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43a4.088 4.088 0 0 1 .957-1.47A4.088 4.088 0 0 1 5.064 2.293c.46-.163 1.26-.35 2.43-.404C8.756 1.83 9.136 1.82 12 1.82zM12 0C8.741 0 8.333.014 7.053.072 5.775.13 4.905.333 4.14.63a5.876 5.876 0 0 0-2.126 1.384A5.876 5.876 0 0 0 .63 4.14C.333 4.905.13 5.775.072 7.053.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.058 1.278.261 2.148.558 2.913a5.876 5.876 0 0 0 1.384 2.126 5.876 5.876 0 0 0 2.126 1.384c.765.297 1.635.5 2.913.558C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.148-.261 2.913-.558a5.876 5.876 0 0 0 2.126-1.384 5.876 5.876 0 0 0 1.384-2.126c.297-.765.5-1.635.558-2.913C23.986 15.667 24 15.259 24 12s-.014-3.667-.072-4.947c-.058-1.278-.261-2.148-.558-2.913a5.876 5.876 0 0 0-1.384-2.126A5.876 5.876 0 0 0 19.86.63C19.095.333 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
        </a>
      </div>
      <p class="trademark-notice">LEGO&reg; is a trademark of the LEGO Group, which does not sponsor, authorize, or endorse this site. Piece Pavilion is an independent reseller.</p>
      <p class="copyright">&copy; 2026 Piece Pavilion. All rights reserved.</p>
    </div>
  </footer>

  </div><!-- end .main-content -->

  <script type="application/json" id="pn-data">{DATA_JSON}</script>
  <script>
  (function () {{
    var PARTS = JSON.parse(document.getElementById('pn-data').textContent);
    var PAGE_URL = '{URL}';

    /* ---- Live stock badges from the Product Finder feed ---- */
    function baseNo(s) {{ var m = /^\\d+/.exec(s || ''); return m ? m[0] : null; }}
    function loadStock() {{
      fetch('/finder-data.json', {{ cache: 'no-store' }}).then(function (r) {{ return r.ok ? r.json() : null; }}).then(function (d) {{
        if (!d || !d.items) return;
        var qty = {{}};
        d.items.forEach(function (it) {{
          if (it.type !== 'PART') return;
          var b = baseNo(it.no); if (!b) return;
          qty[b] = (qty[b] || 0) + (Number(it.qty) || 0);
        }});
        document.querySelectorAll('.pn-stock').forEach(function (el) {{
          var b = baseNo(el.getAttribute('data-stock'));
          var n = b ? qty[b] : 0;
          if (n > 0) {{ el.textContent = 'In stock \\u00b7 ' + n; el.classList.add('on'); }}
        }});
      }}).catch(function () {{}});
    }}
    if ('requestIdleCallback' in window) requestIdleCallback(loadStock); else setTimeout(loadStock, 800);

    /* ---- Quiz ---- */
    var N = 10;
    var body = document.getElementById('quiz-body');
    var pool = PARTS.filter(function (p) {{ return p.q; }});
    var state = null;

    function shuffle(a) {{ for (var i = a.length - 1; i > 0; i--) {{ var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }} return a; }}
    function esc(s) {{ return String(s).replace(/[&<>"']/g, function (c) {{ return {{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]; }}); }}
    function track(name, params) {{ if (typeof gtag === 'function') gtag('event', name, params || {{}}); }}

    function distractors(p) {{
      var same = shuffle(PARTS.filter(function (x) {{ return x.sec === p.sec && x.name !== p.name; }})).slice(0, 3);
      if (same.length < 3) {{
        var more = shuffle(PARTS.filter(function (x) {{ return x.sec !== p.sec && x.name !== p.name; }}));
        while (same.length < 3) same.push(more.pop());
      }}
      return same;
    }}

    function start() {{
      state = {{ qs: shuffle(pool.slice()).slice(0, N), i: 0, score: 0, results: [] }};
      track('quiz_start', {{ quiz: 'name-that-lego-piece' }});
      render();
    }}

    function progress() {{
      var h = '<div class="quiz-progress" aria-hidden="true">';
      for (var k = 0; k < N; k++) {{
        var cls = k < state.i ? (state.results[k] ? 'right' : 'wrong') : (k === state.i ? 'now' : '');
        h += '<span class="' + cls + '"></span>';
      }}
      return h + '</div>';
    }}

    function render() {{
      if (state.i >= N) return finish();
      var p = state.qs[state.i];
      var opts = shuffle(distractors(p).concat([p]));
      var h = progress();
      h += '<div class="quiz-img"><img src="' + p.img + '" alt="Mystery LEGO piece" /></div>';
      h += '<p class="quiz-q">Piece ' + (state.i + 1) + ' of ' + N + ': what is this piece called?</p>';
      h += '<div class="quiz-opts" role="group">';
      opts.forEach(function (o) {{
        h += '<button class="quiz-opt" type="button" data-name="' + esc(o.name) + '">' + esc(o.name) + '</button>';
      }});
      h += '</div><div id="quiz-reveal"></div>';
      body.innerHTML = h;
      body.querySelectorAll('.quiz-opt').forEach(function (b) {{ b.addEventListener('click', function () {{ answer(p, b); }}); }});
      body.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
    }}

    function answer(p, btn) {{
      var right = btn.getAttribute('data-name') === p.name;
      if (right) state.score++;
      state.results.push(right);
      body.querySelectorAll('.quiz-opt').forEach(function (b) {{
        b.disabled = true;
        if (b.getAttribute('data-name') === p.name) b.classList.add('right');
        else if (b === btn) b.classList.add('wrong');
      }});
      var r = document.getElementById('quiz-reveal');
      r.innerHTML = '<div class="quiz-reveal">' + (right ? '<strong>Correct.</strong> ' : '<strong>Not quite.</strong> ') +
        'Builders call it the <strong>' + esc(p.nick) + '</strong>; the catalog calls it <em>' + esc(p.name) + '</em>, part ' + esc(p.no) + '. ' +
        '<a href="/finder/?q=' + encodeURIComponent(p.no) + '" target="_blank" rel="noopener">Find it in our store &rarr;</a></div>' +
        '<div class="quiz-actions"><button class="quiz-btn" type="button" id="quiz-next">' + (state.i + 1 >= N ? 'See my score &rarr;' : 'Next piece &rarr;') + '</button></div>';
      document.getElementById('quiz-next').addEventListener('click', function () {{ state.i++; render(); }});
    }}

    function rank(s) {{
      if (s >= 10) return ['Certified BrickLink Seller', 'Perfect score. You could run our sorting table.'];
      if (s >= 8) return ['Master Builder', 'You read part names like a catalog. The cheat sheet is for everyone else.'];
      if (s >= 6) return ['Bin Sorter', 'Solid. You know the classics and a few of the weird ones.'];
      if (s >= 4) return ['Casual Builder', 'You know what the pieces do, just not what to call them. That is fixable.'];
      return ['Duplo Curious', 'Everyone starts somewhere. Scroll up, read the hall of fame, try again.'];
    }}

    function shareText() {{
      var filled = state.results.map(function (r) {{ return r ? '\\ud83d\\udfe9' : '\\ud83d\\udfe5'; }}).join('');
      return 'I scored ' + state.score + '/' + N + ' on Name That LEGO Piece \\ud83e\\uddf1 ' + filled + '\\nCan you beat me? ' + PAGE_URL;
    }}

    function finish() {{
      var rk = rank(state.score);
      track('quiz_complete', {{ quiz: 'name-that-lego-piece', score: state.score }});
      var h = progress();
      h += '<div class="quiz-score"><div class="sub">You scored</div><div class="big">' + state.score + '/' + N + '</div>' +
           '<div class="rank">' + rk[0] + '</div><p class="sub">' + rk[1] + '</p></div>';
      h += '<div class="quiz-actions"><button class="quiz-btn" type="button" id="quiz-share">Share my score</button>' +
           '<button class="quiz-btn ghost" type="button" id="quiz-again">Play again</button></div>';
      h += '<div class="quiz-copied" id="quiz-copied">Copied. Paste it anywhere.</div>';
      h += '<p class="quiz-share-note" style="text-align:center">Screenshot this and tag <a href="https://www.instagram.com/piecepavilion" target="_blank" rel="noopener">@piecepavilion</a> on Instagram. We repost the best scores.</p>';
      body.innerHTML = h;
      document.getElementById('quiz-again').addEventListener('click', start);
      document.getElementById('quiz-share').addEventListener('click', function () {{
        var text = shareText();
        track('quiz_share', {{ quiz: 'name-that-lego-piece', score: state.score }});
        if (navigator.share) {{
          navigator.share({{ title: 'Name That LEGO Piece', text: text }}).catch(function () {{}});
        }} else if (navigator.clipboard) {{
          navigator.clipboard.writeText(text).then(function () {{ document.getElementById('quiz-copied').classList.add('on'); }});
        }} else {{
          window.prompt('Copy your score:', text);
        }}
      }});
    }}

    document.getElementById('quiz-start').addEventListener('click', start);
    if (location.hash === '#quiz') setTimeout(function () {{ document.getElementById('quiz').scrollIntoView(); }}, 100);
  }})();
  </script>

  <script src="https://f.convertkit.com/ckjs/ck.5.js"></script>
  <script src="../../script.js"></script>
</body>
</html>
'''

out_dir = os.path.join(REPO, "blog", SLUG)
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(PAGE)
print("wrote", os.path.join(out_dir, "index.html"), len(PAGE), "bytes;", len(P), "parts;", QUIZ_N, "in quiz pool")
