// Ersatz für die Android-Brücke: macht aus der App eine Web-App (iPhone, Browser).
// Wird nur gebraucht, wenn die App nicht in der Android-App läuft.
(function () {
  if (window.Android) return;
  var WEB_VERSION = "Web 2.8 (9999)";
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var sauber = function (n) { return String(n).replace(/[^A-Za-z0-9]/g, ""); };
  var pdfB64 = "";
  var lizUrl = function () { return typeof LIZENZ_URL !== "undefined" ? LIZENZ_URL : ""; };

  // Holt eine Adresse über den Lizenz-Server (für PDFs und alles, was der Browser nicht direkt darf)
  function ueberServer(url) {
    var lz = {}; try { lz = JSON.parse(ls.get("p_lizenz") || "{}") || {}; } catch (e) {}
    var u = lizUrl() + "?aktion=hole&code=" + encodeURIComponent(lz.code || "") +
      "&dev=" + encodeURIComponent(ls.get("p_gid") || "") + "&url=" + encodeURIComponent(url);
    return fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.fehler || "Abruf nicht möglich");
      return j.b64;
    });
  }
  var b64ZuText = function (b64) {
    var bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(u8);
  };

  window.Android = {
    get: function (k) { return ls.get("p_" + k) || ""; },
    set: function (k, v) { ls.set("p_" + k, v); },
    csv: function (n) { return ls.get("csv_" + sauber(n)) || ""; },
    laden: function (url, name) {
      var speichern = function (t) { ls.set("csv_" + sauber(name), t); window.onDaten(name, true); };
      fetch(url, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("http"); return r.text(); })
        .then(speichern)
        .catch(function () {   // Notweg: über den Server
          ueberServer(url).then(function (b) { speichern(b64ZuText(b)); }).catch(function () { window.onDaten(name, false); });
        });
    },
    holeText: function (url, tag) {
      fetch(url, { cache: "no-store" })
        .then(function (r) { return r.text().then(function (t) { window.onText(tag, r.ok, t); }); })
        .catch(function () { window.onText(tag, false, ""); });
    },
    postText: function (url, body, tag) {
      // text/plain, damit der Browser keine Vorab-Anfrage (CORS) stellt – Apps Script versteht es trotzdem
      fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
        .then(function (r) { return r.text().then(function (t) { window.onText(tag, r.ok, t); }); })
        .catch(function () { window.onText(tag, false, ""); });
    },
    holePdf: function (url) {
      ueberServer(url).then(function (b) { pdfB64 = b; window.onPdf(true); }).catch(function () { window.onPdf(false); });
    },
    pdfBase64: function () { return pdfB64; },
    leeren: function () { ["db", "tabelle", "verl"].forEach(function (n) { ls.del("csv_" + n); }); },
    version: function () { return WEB_VERSION; }
    // appUpdate gibt es bewusst nicht: die Web-Version aktualisiert sich selbst
  };

  // Ohne APK-Update-Karte
  document.addEventListener("DOMContentLoaded", function () {
    var st = document.createElement("style");
    st.textContent = "#updCard{display:none!important}";
    document.head.appendChild(st);
  });

  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
