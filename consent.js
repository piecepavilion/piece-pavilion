(function () {
  "use strict";
  var STORAGE_KEY = "pp_consent";
  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  var isEU = /^(Europe\/|Atlantic\/Reykjavik|Atlantic\/Canary|Atlantic\/Faroe)/.test(tz);
  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  function gtagConsent(state) {
    if (typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: state,
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state
    });
  }

  if (!isEU) { gtagConsent("granted"); return; }
  if (stored === "granted") { gtagConsent("granted"); return; }
  if (stored === "denied") { return; }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "pp-consent";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Cookie consent");
    wrap.innerHTML =
      '<div class="pp-consent-inner">' +
      '<p>We use analytics cookies to understand how our site is used. No ads. No sale of data.</p>' +
      '<div class="pp-consent-actions">' +
      '<button type="button" class="pp-consent-decline">Decline</button>' +
      '<button type="button" class="pp-consent-accept">Accept</button>' +
      "</div></div>";
    var style = document.createElement("style");
    style.textContent =
      ".pp-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:1700;max-width:420px;margin-left:auto;background:#1a1a1a;color:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:Nunito,system-ui,sans-serif;font-size:14px;line-height:1.4}" +
      ".pp-consent-inner{padding:16px 18px}" +
      ".pp-consent p{margin:0 0 12px}" +
      ".pp-consent-actions{display:flex;gap:8px;justify-content:flex-end}" +
      ".pp-consent button{min-height:36px;padding:8px 16px;border:0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px}" +
      ".pp-consent-decline{background:transparent;color:#ccc}" +
      ".pp-consent-decline:hover{color:#fff}" +
      ".pp-consent-accept{background:#ffd400;color:#1a1a1a}" +
      ".pp-consent-accept:hover{background:#ffdf33}";
    document.head.appendChild(style);
    document.body.appendChild(wrap);
    wrap.querySelector(".pp-consent-accept").addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "granted"); } catch (e) {}
      gtagConsent("granted");
      wrap.remove();
    });
    wrap.querySelector(".pp-consent-decline").addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "denied"); } catch (e) {}
      wrap.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
