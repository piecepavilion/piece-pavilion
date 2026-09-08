/**
 * Piece Pavilion — pick sheet core logic.
 *
 * Pure functions, no DOM: bin parsing/sorting, BrickLink order-page parsing,
 * lot expansion and parse validation. Shared by the staff page and by
 * test_pick_core.js in the private ops repo, which asserts the acceptance
 * criteria in PICK_SHEET_SPEC.txt section 7. Run it after changing this file:
 *     node test_pick_core.js        (from piece-pavilion-ops/)
 *
 * Loaded as a plain script (window.PickCore) and as a CommonJS module.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PickCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Sentinel bin for lots whose location is blank or unparseable. 239 lots in
  // live inventory have no location at all, and others carry free text
  // ("Cheshire Cat", "(N) IN BAG"). The spec forbids silently dropping a lot —
  // a missing lot is a short shipment — so these get their own group, sorted
  // last, and are surfaced in the parse report.
  var NO_BIN = "No bin";

  // ---------------------------------------------------------------- entities
  var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

  /** Decode the HTML entities BrickLink returns ("B-1 &#40;need hands&#41;"). */
  function decodeEntities(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(parseInt(d, 10)); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
      .replace(/&([a-z]+);/gi, function (m, n) {
        var v = ENTITIES[n.toLowerCase()];
        return v === undefined ? m : v;
      });
  }

  // -------------------------------------------------------------------- bins
  // A bin is a letter prefix, a number, and an optional sub-bin. Live data uses
  // three sub separators: "/" (B-5/G, ~870 lots), "-" (B-4-C) and "\" (P-12\3).
  var BIN_RE = /^([A-Za-z]{1,2})-?(\d{1,3})(?:[/\\-]([A-Za-z0-9]{1,3}))?$/;
  // A bare sub-bin token, i.e. the "B" in "B-2/B" — no digits of its own.
  var SUB_RE = /^[A-Za-z0-9]{1,3}$/;

  function binCode(prefix, num, sub) {
    return prefix + "-" + num + (sub ? "/" + sub : "");
  }

  /**
   * Parse a raw BrickLink remarks/location string into one or more bins.
   *
   * Handles, all seen in live inventory:
   *   "B-1"                -> one bin
   *   "B-3/C" "B-4-C" "P-12\3" -> bin + sub-bin (three separators)
   *   "B-2/B"              -> bin B-2, sub-bin B (bare token after "/")
   *   "S-10(1)/P-12(2)"    -> TWO bins with per-bin quantities
   *   "B-1 (need white hands)" -> bin + note
   *   "B-5/G(!!)"          -> bin + note
   *   "b-3/C"              -> case-normalised to B-3/C
   *   "Binder-1" "V" ""    -> unparseable, ok:false
   *
   * A parenthetical of pure digits is a per-bin quantity; anything else is a
   * note worth showing the picker.
   */
  function parseLocation(raw) {
    var s = decodeEntities(raw || "").replace(/\s+/g, " ").trim();
    var out = { raw: s, bins: [], notes: [], ok: false };
    if (!s) return out;

    var tokens = s.split("/");
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i].trim();
      if (!tok) continue;

      // Pull every parenthetical off this token: digits -> qty, else -> note.
      var qty = null;
      tok = tok.replace(/\(([^)]*)\)/g, function (_, inner) {
        var v = inner.trim();
        if (/^\d+$/.test(v)) qty = parseInt(v, 10);
        else if (v) out.notes.push(v);
        return " ";
      });
      // Strip stray separators left behind ("B-2-/B(1)" -> "B-2-").
      tok = tok.replace(/\s+/g, " ").trim().replace(/[-/\\]+$/, "").trim();
      if (!tok) continue;

      var m = BIN_RE.exec(tok);
      if (m) {
        out.bins.push({
          code: binCode(m[1].toUpperCase(), parseInt(m[2], 10), (m[3] || "").toUpperCase()),
          prefix: m[1].toUpperCase(),
          num: parseInt(m[2], 10),
          sub: (m[3] || "").toUpperCase(),
          qty: qty,
        });
        continue;
      }
      // A bare token straight after a real bin is that bin's sub-bin.
      if (SUB_RE.test(tok) && out.bins.length) {
        var prev = out.bins[out.bins.length - 1];
        if (!prev.sub) {
          prev.sub = tok.toUpperCase();
          prev.code = binCode(prev.prefix, prev.num, prev.sub);
          if (qty != null) prev.qty = qty;
          continue;
        }
      }
      // Anything else is free text, not a location.
      out.notes.push(tok);
    }

    out.ok = out.bins.length > 0;
    out.note = out.notes.join(" ");
    return out;
  }

  /** Natural sort key: letter prefix, then number, then sub-bin. */
  function binSortKey(code) {
    if (code === NO_BIN) return ["￿", Infinity, "￿"];
    var m = BIN_RE.exec(code);
    if (!m) return ["￿", Infinity, String(code)];
    return [m[1].toUpperCase(), parseInt(m[2], 10), (m[3] || "").toUpperCase()];
  }

  /**
   * Compare two bin codes. "B-2/C" before "B-10/A" and plain "B-2" before
   * "B-2/C" — a lexical string sort gets both wrong.
   */
  function compareBins(a, b) {
    var ka = binSortKey(a), kb = binSortKey(b);
    if (ka[0] !== kb[0]) return ka[0] < kb[0] ? -1 : 1;
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    if (ka[2] !== kb[2]) return ka[2] < kb[2] ? -1 : 1;
    return 0;
  }

  function sortBins(codes) {
    return codes.slice().sort(compareBins);
  }

  // ------------------------------------------------------------------ images
  function typeLetter(t) {
    var k = String(t || "P").toUpperCase();
    return { P: "P", PART: "P", M: "M", MINIFIG: "M", S: "S", SET: "S",
             G: "G", GEAR: "G", B: "B", BOOK: "B", C: "C", CATALOG: "C",
             I: "I", INSTRUCTION: "I", O: "O", ORIGINAL_BOX: "O" }[k] || "P";
  }

  /**
   * Path to the picture, served from our own domain. The Worker fetches the
   * BrickLink catalog image once, stores it in KV and serves it thereafter —
   * the spec forbids hotlinking img.bricklink.com (someone else's bandwidth,
   * and a remote fetch may never arrive from a warehouse with poor coverage).
   */
  function imagePath(type, no, colorId) {
    var t = typeLetter(type);
    var c = t === "P" ? (colorId || 0) : 0;
    return "/employees/api/pick/img/" + t + "/" + c + "/" + encodeURIComponent(no) + ".png";
  }

  // ------------------------------------------------------------------- money
  function money(n) {
    return "$" + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  }

  /** Unit prices carry up to 4 decimals ($0.114, $0.475) — never round for display. */
  function unitPrice(n) {
    var v = Number(n) || 0;
    var s = v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    if (!/\./.test(s)) s += ".00";
    else if (s.split(".")[1].length === 1) s += "0";
    return "$" + s;
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  // ------------------------------------------------- BrickLink paste parsing
  var LOT_RE = /^\s*Lot ID:\s*(\d+)/;
  var ITEMNO_RE = /(Part|Minifig|Set|Book|Gear|Catalog|Instruction|Box)\s+No:\s*(\S+)/i;
  var NAME_RE = /Name:\s*(.+)$/;
  // " \t3\tX\tUS $0.40\tUS $1.20" — tabs in practice, but stay lenient.
  var QTY_RE = /^[\s*!]*(\d+)\s+X\s+US\s*\$\s*([\d.,]+)\s+US\s*\$\s*([\d.,]+)\s*$/i;
  var FLAG_RE = /^[\s*!]+$/;
  var TYPE_LETTER = { part: "P", minifig: "M", set: "S", book: "B", gear: "G",
                      catalog: "C", instruction: "I", box: "O" };

  function num(s) {
    return parseFloat(String(s).replace(/,/g, "")) || 0;
  }

  /**
   * Parse the "Items in Order" table copied off a BrickLink order page.
   *
   * The paste is the fallback input path (the API path carries structured data
   * and a real color_id). Returns { lots, header, problems } — problems are
   * shown to the user rather than swallowed, because a lot that fails to parse
   * would otherwise become a short shipment.
   */
  function parseOrderPaste(text, colorTable) {
    var colors = (colorTable && colorTable.colors) || colorTable || {};
    var lines = String(text || "").split(/\r?\n/);
    var problems = [];
    var lots = [];

    // Where each lot block starts.
    var starts = [];
    for (var i = 0; i < lines.length; i++) if (LOT_RE.test(lines[i])) starts.push(i);

    if (!starts.length) {
      problems.push("No lots found. Copy the “Items in Order” table from the BrickLink order page and paste it here.");
      return { lots: [], header: parseHeader(lines), problems: problems };
    }

    for (var s = 0; s < starts.length; s++) {
      var from = starts[s];
      var to = s + 1 < starts.length ? starts[s + 1] : lines.length;
      var lot = parseLotBlock(lines.slice(from, to), colors, problems);
      if (lot) lots.push(lot);
    }

    return { lots: lots, header: parseHeader(lines), problems: problems };
  }

  function parseLotBlock(block, colors, problems) {
    var head = block[0];
    var lotId = (LOT_RE.exec(head) || [])[1];
    var mNo = ITEMNO_RE.exec(head);
    var mName = NAME_RE.exec(head);

    var lot = {
      lot_id: lotId || "",
      item_type: mNo ? TYPE_LETTER[mNo[1].toLowerCase()] || "P" : "P",
      item_no: mNo ? mNo[2] : "",
      name: mName ? decodeEntities(mName[1].trim()) : "",
      color_name: "",
      color_id: 0,
      remark: "",
      condition: "",
      qty: 0,
      unit_price: 0,
      line_total: 0,
      location_raw: "",
    };

    if (!lot.item_no) {
      problems.push("Lot " + (lotId || "?") + ": could not read the item number.");
    }

    // Find the numeric row; the location is the line immediately before it.
    var qtyIdx = -1, mQty = null;
    for (var i = block.length - 1; i > 0; i--) {
      var m = QTY_RE.exec(block[i].replace(/\t/g, " ").trim());
      if (m) { qtyIdx = i; mQty = m; break; }
    }
    if (!mQty) {
      problems.push("Lot " + (lotId || "?") + " (" + (lot.item_no || "?") + "): no quantity/price row found — check the paste.");
      return lot;
    }
    lot.qty = parseInt(mQty[1], 10) || 0;
    lot.unit_price = num(mQty[2]);
    lot.line_total = num(mQty[3]);

    if (qtyIdx - 1 > 0) lot.location_raw = decodeEntities(block[qtyIdx - 1].trim());

    // Body = everything between the header line and the location line.
    var body = [];
    for (var j = 1; j < qtyIdx - 1; j++) {
      var t = block[j].replace(/\s+$/, "");
      if (!t.trim() || FLAG_RE.test(t)) continue;   // "*" / "!" are BrickLink flags, not data
      body.push(t);
    }

    // Condition is a line that is exactly New or Used.
    for (var k = 0; k < body.length; k++) {
      var tt = body[k].trim();
      if (tt === "New" || tt === "Used") {
        lot.condition = tt;
        body.splice(k, 1);
        break;
      }
    }
    if (!lot.condition) lot.condition = "Used";

    // For parts the next line is the colour — but validate it against the
    // catalogue, because a description line sits in the same position.
    if (lot.item_type !== "M" && body.length) {
      var cand = decodeEntities(body[0].trim());
      if (Object.prototype.hasOwnProperty.call(colors, cand)) {
        lot.color_name = cand;
        lot.color_id = colors[cand];
        body.shift();
      }
    }
    if (lot.item_type !== "M" && !lot.color_name && lot.item_no) {
      problems.push("Lot " + lot.lot_id + " (" + lot.item_no + "): colour not recognised — the picture may be missing.");
    }

    // What remains repeats the item name, with the seller remark appended.
    var rest = body.join(" ").replace(/\s+/g, " ").trim();
    if (rest && lot.name) {
      var bare = lot.name.replace(/\s+/g, " ").trim();
      if (rest.indexOf(bare) === 0) rest = rest.slice(bare.length).trim();
    }
    lot.remark = decodeEntities(rest).replace(/^[-–—:,\s]+/, "").trim();

    return lot;
  }

  function parseHeader(lines) {
    var text = lines.join("\n");
    var h = { submitted: "", lots: null, pieces: null, total: null };
    var m;
    if ((m = /Submitted\s*(?:on)?[:\s]+([^\n]+)/i.exec(text))) h.submitted = m[1].trim();
    if ((m = /Unique\s+Items?\s*\(Lots\)[:\s]*([\d,]+)/i.exec(text))) h.lots = parseInt(m[1].replace(/,/g, ""), 10);
    if ((m = /Total\s+(?:Items|Pieces)[:\s]*([\d,]+)/i.exec(text))) h.pieces = parseInt(m[1].replace(/,/g, ""), 10);
    if ((m = /(?:Batch|Order|Grand)\s+Total[:\s]*US\s*\$\s*([\d,.]+)/i.exec(text))) h.total = num(m[1]);
    return h;
  }

  // -------------------------------------------------------------- validation
  /**
   * Cross-check the parse against the order's own stated totals, per spec
   * section 3. Anything that fails is shown before picking starts.
   */
  function validateParse(lots, header) {
    var problems = [];
    var pieces = 0, dollars = 0, unlocated = 0;

    lots.forEach(function (l) {
      pieces += l.qty || 0;
      dollars += (l.qty || 0) * (l.unit_price || 0);
      var loc = parseLocation(l.location_raw);
      if (!loc.ok) unlocated++;
      // A line total that disagrees with qty x unit price means a bad parse.
      if (l.line_total && Math.abs(round2(l.qty * l.unit_price) - round2(l.line_total)) > 0.011) {
        problems.push("Lot " + l.lot_id + " (" + l.item_no + "): " + l.qty + " x " +
          unitPrice(l.unit_price) + " = " + money(l.qty * l.unit_price) +
          ", but the row says " + money(l.line_total) + ".");
      }
      if (!l.qty) problems.push("Lot " + l.lot_id + " (" + l.item_no + "): quantity is zero.");
    });

    if (header && header.lots != null && header.lots !== lots.length) {
      problems.push("Parsed " + lots.length + " lots but the order says " + header.lots + ".");
    }
    if (header && header.pieces != null && header.pieces !== pieces) {
      problems.push("Parsed " + pieces + " pieces but the order says " + header.pieces + ".");
    }
    if (header && header.total != null && Math.abs(round2(dollars) - round2(header.total)) > 0.011) {
      problems.push("Parsed " + money(dollars) + " but the order total is " + money(header.total) + ".");
    }
    if (unlocated) {
      problems.push(unlocated + (unlocated === 1 ? " lot has" : " lots have") +
        " no usable bin code — grouped under “" + NO_BIN + "” at the end, not dropped.");
    }

    return { problems: problems, lots: lots.length, pieces: pieces, dollars: round2(dollars), unlocated: unlocated };
  }

  // ---------------------------------------------------------- rows and bins
  /**
   * One lot becomes one pick row — except a lot split across bins with
   * per-bin quantities ("S-10(1)/P-12(2)"), which becomes one row per bin so
   * the picker visits both. Showing only one bin there would ship short.
   *
   * NEVER merges lots. The same item_no + colour legitimately appears as
   * several lots in different bins at different prices; each lot_id is always
   * its own row, keyed by row_key.
   */
  function expandRows(lots) {
    var rows = [];
    lots.forEach(function (l) {
      var loc = parseLocation(l.location_raw);
      var base = {
        lot_id: String(l.lot_id || ""),
        item_type: l.item_type || "P",
        item_no: l.item_no || "",
        name: l.name || "",
        color_name: l.color_name || "",
        color_id: l.color_id || 0,
        condition: l.condition || "Used",
        unit_price: l.unit_price || 0,
        remark: l.remark || "",
        location_raw: l.location_raw || "",
        bin_note: loc.note || "",
      };

      if (!loc.ok) {
        rows.push(Object.assign({}, base, {
          row_key: base.lot_id, bin: NO_BIN, qty: l.qty || 0, split: false, unlocated: true,
        }));
        return;
      }

      // Split only when the per-bin quantities are present and add up; if they
      // do not, keep one row and let validation flag it rather than guessing.
      var qtySum = loc.bins.reduce(function (a, b) { return a + (b.qty || 0); }, 0);
      var canSplit = loc.bins.length > 1 && qtySum === (l.qty || 0) &&
        loc.bins.every(function (b) { return b.qty > 0; });

      if (canSplit) {
        loc.bins.forEach(function (b, i) {
          rows.push(Object.assign({}, base, {
            row_key: base.lot_id + "#" + i, bin: b.code, qty: b.qty,
            split: true, split_of: loc.bins.length, unlocated: false,
          }));
        });
        return;
      }

      rows.push(Object.assign({}, base, {
        row_key: base.lot_id,
        bin: loc.bins[0].code,
        qty: l.qty || 0,
        split: false,
        unlocated: false,
        extra_bins: loc.bins.slice(1).map(function (b) { return b.code; }),
      }));
    });
    return rows;
  }

  /** Group rows into bins, bins in natural order, NO_BIN last. */
  function groupRows(rows) {
    var by = {};
    rows.forEach(function (r) { (by[r.bin] = by[r.bin] || []).push(r); });
    return sortBins(Object.keys(by)).map(function (code) {
      return { bin: code, rows: by[code] };
    });
  }

  /**
   * Progress counts for the header bar.
   *
   * Counted per ROW, because a lot split across two bins is two separate pulls.
   * `distinctLots` is the underlying lot count, so the caller can label the
   * figure honestly: with no split lots (the normal case) rows === distinctLots
   * and the display is the spec's "12/33 lots"; when a lot is split the two
   * differ and the unit is really a pick, not a lot.
   */
  function progress(rows, marks) {
    var m = marks || {};
    var t = { lots: rows.length, lotsPicked: 0, lotsNotFound: 0,
              pieces: 0, piecesPicked: 0, piecesNotFound: 0, distinctLots: 0 };
    var seen = {};
    rows.forEach(function (r) {
      seen[r.lot_id] = 1;
      var st = (m[r.row_key] && m[r.row_key].status) || "to_pick";
      t.pieces += r.qty;
      if (st === "picked") { t.lotsPicked++; t.piecesPicked += r.qty; }
      else if (st === "not_found") { t.lotsNotFound++; t.piecesNotFound += r.qty; }
    });
    t.distinctLots = Object.keys(seen).length;
    return t;
  }

  /** "1 lot" / "2 lots" — plural agreement for the counts we print. */
  function plural(n, one, many) {
    return n + " " + (n === 1 ? one : (many || one + "s"));
  }

  /** Plain-text not-found list, for a second sweep or a message to the buyer. */
  function notFoundText(rows, marks, orderId) {
    var m = marks || {};
    var out = rows.filter(function (r) { return (m[r.row_key] || {}).status === "not_found"; });
    if (!out.length) return "";
    var lines = ["Order " + (orderId || "") + " — could not find " + out.length + " lot" + (out.length === 1 ? "" : "s") + ":"];
    groupRows(out).forEach(function (g) {
      g.rows.forEach(function (r) {
        lines.push("  " + g.bin + "  x" + r.qty + "  " + r.item_no +
          (r.color_name ? "  " + r.color_name : "") + "  " + r.name +
          "  (lot " + r.lot_id + ")");
      });
    });
    return lines.join("\n");
  }

  return {
    NO_BIN: NO_BIN,
    decodeEntities: decodeEntities,
    parseLocation: parseLocation,
    binSortKey: binSortKey,
    compareBins: compareBins,
    sortBins: sortBins,
    typeLetter: typeLetter,
    imagePath: imagePath,
    money: money,
    unitPrice: unitPrice,
    round2: round2,
    parseOrderPaste: parseOrderPaste,
    validateParse: validateParse,
    expandRows: expandRows,
    groupRows: groupRows,
    progress: progress,
    plural: plural,
    notFoundText: notFoundText,
  };
});
