/**
 * Piece Pavilion — inventory lookup core logic.
 *
 * Pure functions, no DOM: part-size parsing, faceting, multi-term search,
 * filtering, sorting, totals and CSV export. Shared by the staff page and by
 * test_inv_core.js in the private ops repo. Run after changing this file:
 *     node test_inv_core.js        (from piece-pavilion-ops/)
 *
 * Bin/location parsing is deliberately NOT reimplemented here — it comes from
 * pick-core.js, so "no location" means exactly the same thing on this page as
 * it does on the pick sheet.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../pick/pick-core.js"));
  } else {
    root.InvCore = factory(root.PickCore);
  }
})(typeof self !== "undefined" ? self : this, function (PickCore) {
  "use strict";

  var NO_LOCATION = "— no location —";

  // ------------------------------------------------------------------- size
  // Rectangular part dimensions as printed in the catalogue name:
  //   "Brick 2 x 4", "Slope 45 2 x 2", "Brick, Round 1 x 1 x 2/3"
  // About a fifth of parts have none, and correctly so — bones, bars, plants,
  // animals and headgear are not rectangular. Those get size "" and are
  // reachable via the "(no size)" facet rather than being hidden.
  var DIM_RE = /(\d+(?:\/\d+)?(?:\.\d+)?)\s*[xX]\s*(\d+(?:\/\d+)?(?:\.\d+)?)(?:\s*[xX]\s*(\d+(?:\/\d+)?(?:\.\d+)?))?/;

  /** "Brick 2 x 4" -> { key: "2 x 4", dims: [2,4] }; null when there is none. */
  function parseSize(name) {
    var m = DIM_RE.exec(String(name || ""));
    if (!m) return null;
    var parts = [m[1], m[2], m[3]].filter(function (x) { return x != null; });
    return { key: parts.join(" x "), dims: parts.map(fracToNum) };
  }

  /** "2/3" -> 0.667, "1.5" -> 1.5, "2" -> 2. Catalogue names use both. */
  function fracToNum(s) {
    s = String(s);
    if (s.indexOf("/") > -1) {
      var a = s.split("/");
      return (parseFloat(a[0]) || 0) / (parseFloat(a[1]) || 1);
    }
    return parseFloat(s) || 0;
  }

  /** Sort size keys by each dimension in turn, so 1x2 < 1x10 < 2x2. */
  function compareSizes(a, b) {
    if (a === b) return 0;
    if (!a) return 1;          // "(no size)" last
    if (!b) return -1;
    var da = a.split(" x ").map(fracToNum), db = b.split(" x ").map(fracToNum);
    for (var i = 0; i < Math.max(da.length, db.length); i++) {
      var x = da[i] == null ? -1 : da[i], y = db[i] == null ? -1 : db[i];
      if (x !== y) return x - y;
    }
    return 0;
  }

  // -------------------------------------------------------------- decorate
  /**
   * Add the derived fields the UI filters and sorts on. Done once on load so
   * every keystroke afterwards is a cheap scan.
   */
  function decorate(items, nowMs) {
    var now = nowMs || Date.now();
    return (items || []).map(function (it) {
      var size = parseSize(it.name);
      var loc = PickCore.parseLocation(it.location || "");
      var added = it.added ? Date.parse(it.added) : NaN;
      var qty = Number(it.qty) || 0;
      var price = Number(it.price) || 0;
      var d = {
        lot_id: String(it.lot_id || ""),
        item_no: it.item_no || "",
        name: PickCore.decodeEntities(it.name || ""),
        type: it.type || "PART",
        color_name: it.color_name || "",
        color_id: Number(it.color_id) || 0,
        // BrickLink escapes category names too ("Botanicals &#40;...&#41;").
        category: PickCore.decodeEntities(it.category || "") || "(Uncategorised)",
        condition: it.condition === "N" || it.condition === "New" ? "New" : "Used",
        price: price,
        qty: qty,
        value: Math.round(price * qty * 10000) / 10000,
        // Decoded, because unrecognised locations are shown to staff verbatim
        // and BrickLink escapes them ("Binder &#40;A&#41;").
        location_raw: PickCore.decodeEntities(it.location || "").trim(),
        bins: loc.bins.map(function (b) { return b.code; }),
        bin: loc.ok ? loc.bins[0].code : NO_LOCATION,
        bin_note: loc.note || "",
        located: loc.ok,
        // Two different problems, both needing a fix but not the same fix:
        //   "blank"        - nothing entered at all
        //   "unrecognised" - something is there ("Binder-1", "Cheshire Cat")
        //                    but it is not a bin code we can sort or walk to
        bin_state: loc.ok ? "ok" : ((it.location || "").trim() ? "unrecognised" : "blank"),
        note: PickCore.decodeEntities(it.note || ""),
        added: it.added || "",
        days: isNaN(added) ? null : Math.floor((now - added) / 86400000),
        stockroom: !!it.stockroom,
        retain: !!it.retain,
        my_cost: Number(it.my_cost) || 0,
        sale_rate: Number(it.sale_rate) || 0,
        size: size ? size.key : "",
      };
      // One lowercase haystack per lot, so multi-term search stays fast. Sizes
      // are indexed in both spaced and collapsed form ("2 x 4" and "2x4") so a
      // search for either spelling hits, and so the collapsed token can be
      // matched as ONE term — see collapseSizes().
      d._hay = collapseSizes([d.item_no, d.name, d.color_name, d.category, d.type,
                              d.condition, d.size, d.location_raw, d.note, d.lot_id]
        .join(" ").toLowerCase()) + " " + d.name.toLowerCase();
      return d;
    });
  }

  // ---------------------------------------------------------------- facets
  /** Value -> count for each filterable dimension, for populating dropdowns. */
  function facets(items) {
    var f = { type: {}, color_name: {}, category: {}, size: {}, condition: {}, bin: {} };
    (items || []).forEach(function (it) {
      Object.keys(f).forEach(function (k) {
        var v = k === "size" && !it.size ? "" : it[k];
        f[k][v] = (f[k][v] || 0) + 1;
      });
    });
    var out = {};
    Object.keys(f).forEach(function (k) {
      var entries = Object.keys(f[k]).map(function (v) { return { value: v, count: f[k][v] }; });
      if (k === "size") entries.sort(function (a, b) { return compareSizes(a.value, b.value); });
      else if (k === "bin") entries.sort(function (a, b) {
        if (a.value === NO_LOCATION) return 1;
        if (b.value === NO_LOCATION) return -1;
        return PickCore.compareBins(a.value, b.value);
      });
      else entries.sort(function (a, b) { return b.count - a.count || String(a.value).localeCompare(String(b.value)); });
      out[k] = entries;
    });
    return out;
  }

  // ---------------------------------------------------------------- search
  /**
   * Squash "2 x 4" down to "2x4" so a size survives whitespace tokenisation as
   * a single term. Without this, "brick 2 x 4" splits into brick/2/x/4 and the
   * bare "4" matches any part number containing a 4 — which returned 375 lots
   * instead of the actual 2x4s. Repeats because three-dimension sizes need two
   * passes ("1 x 1 x 2/3" -> "1x1 x 2/3" -> "1x1x2/3").
   */
  function collapseSizes(s) {
    var re = /(\d+(?:\/\d+)?(?:\.\d+)?)\s*x\s*(\d+(?:\/\d+)?(?:\.\d+)?)/g;
    for (var i = 0; i < 3; i++) {
      var next = s.replace(re, "$1x$2");
      if (next === s) break;
      s = next;
    }
    return s;
  }

  /**
   * Every whitespace-separated term must appear somewhere in the lot, so
   * "red 2x4 brick" narrows the way you would expect. Sizes are collapsed on
   * both sides first, so "2 x 4", "2x4" and "2X4" are one term and all match
   * the same lots.
   */
  function matchesText(it, text) {
    if (!text) return true;
    var terms = collapseSizes(String(text).toLowerCase()).split(/\s+/).filter(Boolean);
    for (var i = 0; i < terms.length; i++) {
      if (it._hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }

  /**
   * Apply the filter object. Unset keys are ignored, so the same function
   * serves the presets and the manual dropdowns.
   *
   * q = { text, type, color_name, category, size, condition, bin,
   *       located: true|false, stockroom, retain, onSale,
   *       maxQty, minQty, minPrice, maxPrice, minDays, noCost }
   */
  function filter(items, q) {
    q = q || {};
    return (items || []).filter(function (it) {
      if (!matchesText(it, q.text)) return false;
      if (q.type && it.type !== q.type) return false;
      if (q.color_name && it.color_name !== q.color_name) return false;
      if (q.category && it.category !== q.category) return false;
      if (q.size != null && q.size !== "" && it.size !== q.size) return false;
      if (q.sizeIsBlank && it.size !== "") return false;
      if (q.condition && it.condition !== q.condition) return false;
      if (q.bin && it.bin !== q.bin) return false;
      if (q.located === true && !it.located) return false;
      if (q.located === false && it.located) return false;
      if (q.bin_state && it.bin_state !== q.bin_state) return false;
      if (q.stockroom === true && !it.stockroom) return false;
      if (q.stockroom === false && it.stockroom) return false;
      if (q.retain === true && !it.retain) return false;
      if (q.onSale === true && !(it.sale_rate > 0)) return false;
      if (q.noCost === true && it.my_cost > 0) return false;
      if (q.minQty != null && it.qty < q.minQty) return false;
      if (q.maxQty != null && it.qty > q.maxQty) return false;
      if (q.minPrice != null && it.price < q.minPrice) return false;
      if (q.maxPrice != null && it.price > q.maxPrice) return false;
      if (q.minDays != null && !(it.days != null && it.days >= q.minDays)) return false;
      return true;
    });
  }

  // ------------------------------------------------------------------ sort
  var SORTS = {
    bin:      function (a, b) { return cmpBin(a, b) || a.name.localeCompare(b.name); },
    name:     function (a, b) { return a.name.localeCompare(b.name); },
    item_no:  function (a, b) { return String(a.item_no).localeCompare(String(b.item_no)); },
    color:    function (a, b) { return a.color_name.localeCompare(b.color_name) || a.name.localeCompare(b.name); },
    category: function (a, b) { return a.category.localeCompare(b.category) || a.name.localeCompare(b.name); },
    size:     function (a, b) { return compareSizes(a.size, b.size) || a.name.localeCompare(b.name); },
    price:    function (a, b) { return a.price - b.price; },
    qty:      function (a, b) { return a.qty - b.qty; },
    value:    function (a, b) { return a.value - b.value; },
    days:     function (a, b) { return (a.days == null ? -1 : a.days) - (b.days == null ? -1 : b.days); },
  };

  function cmpBin(a, b) {
    if (a.bin === b.bin) return 0;
    if (a.bin === NO_LOCATION) return 1;
    if (b.bin === NO_LOCATION) return -1;
    return PickCore.compareBins(a.bin, b.bin);
  }

  function sort(items, key, dir) {
    var fn = SORTS[key] || SORTS.bin;
    var out = items.slice().sort(fn);
    if (dir === "desc") out.reverse();
    return out;
  }

  // ---------------------------------------------------------------- totals
  function totals(items) {
    var t = { lots: items.length, pieces: 0, value: 0, unlocated: 0,
              blank: 0, unrecognised: 0, stockroom: 0 };
    items.forEach(function (it) {
      t.pieces += it.qty;
      t.value += it.value;
      if (!it.located) {
        t.unlocated++;
        if (it.bin_state === 'blank') t.blank++; else t.unrecognised++;
      }
      if (it.stockroom) t.stockroom++;
    });
    t.value = Math.round(t.value * 100) / 100;
    return t;
  }

  // ------------------------------------------------------------------- CSV
  var CSV_COLS = [
    ["bin", "Location"], ["item_no", "Item No"], ["name", "Description"],
    ["color_name", "Color"], ["category", "Category"], ["size", "Size"],
    ["condition", "Condition"], ["qty", "Quantity"], ["price", "Price"],
    ["value", "Lot Value"], ["days", "Days In Stock"], ["lot_id", "Lot ID"],
    ["type", "Item Type"], ["note", "Note"],
  ];

  function csvCell(v) {
    var s = v == null ? "" : String(v);
    // Guard against a leading =/+/-/@ being read as a formula by Excel.
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** Current filter as CSV — for working through a list away from the screen. */
  function toCsv(items) {
    var lines = [CSV_COLS.map(function (c) { return c[1]; }).join(",")];
    items.forEach(function (it) {
      lines.push(CSV_COLS.map(function (c) {
        var v = it[c[0]];
        if (c[0] === "bin" && v === NO_LOCATION) v = "";
        return csvCell(v);
      }).join(","));
    });
    return lines.join("\r\n");
  }

  // --------------------------------------------------------------- presets
  // The saved views worth a single tap. "No location" is first because it is
  // the reason this page exists.
  var PRESETS = [
    { id: "noloc",     label: "No location",      q: { located: false } },
    { id: "badloc",    label: "Unrecognised bin",  q: { bin_state: "unrecognised" } },
    { id: "stockroom", label: "In stockroom",     q: { stockroom: true } },
    { id: "aging",     label: "In stock 90+ days", q: { minDays: 90 } },
    { id: "last",      label: "Last one left",    q: { maxQty: 1 } },
    { id: "onsale",    label: "On sale",          q: { onSale: true } },
    { id: "figs",      label: "Minifigures",      q: { type: "MINIFIG" } },
  ];

  return {
    NO_LOCATION: NO_LOCATION,
    parseSize: parseSize,
    fracToNum: fracToNum,
    compareSizes: compareSizes,
    decorate: decorate,
    facets: facets,
    matchesText: matchesText,
    filter: filter,
    sort: sort,
    sortKeys: Object.keys(SORTS),
    totals: totals,
    toCsv: toCsv,
    PRESETS: PRESETS,
  };
});
