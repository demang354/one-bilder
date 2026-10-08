/* Feedback-Modus (nur mit ?feedback in der Adresse): Markierungen setzen, kommentieren, gesammelt kopieren. */
(function () {
  if (!new URLSearchParams(location.search).has("feedback")) return;

  const SPEICHER = "one-bilder-feedback-v1";
  let punkte = [];
  try { punkte = JSON.parse(localStorage.getItem(SPEICHER)) || []; } catch (e) {}
  const sichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(punkte)); } catch (e) {} };
  let aktiv = true;

  const css = document.createElement("style");
  css.textContent = `
    .fb-leiste { position: fixed; z-index: 50; left: 50%; bottom: 16px; transform: translateX(-50%);
      display: flex; gap: 8px; align-items: center; padding: 8px; border-radius: 12px;
      background: #1A1210; color: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.3); font: 15px system-ui, sans-serif; }
    .fb-leiste button { min-height: 40px; padding: 0 14px; border-radius: 8px; border: 0; cursor: pointer; font: 600 15px system-ui, sans-serif; white-space: nowrap; }
    .fb-an { background: #E6CCAA; color: #1A1210; }
    .fb-aus { background: #3a2a24; color: #E6CCAA; }
    .fb-kopie { background: #B2573A; color: #fff; }
    .fb-leer { background: transparent; color: #bbb; text-decoration: underline; min-width: 84px; }
    .fb-leer[data-sicher] { color: #fff; background: #8a2a1a; text-decoration: none; }
    .fb-zahl { padding: 0 6px; color: #E6CCAA; white-space: nowrap; }
    body.fb-markieren, body.fb-markieren * { cursor: crosshair !important; }
    .fb-pin { position: absolute; z-index: 40; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%;
      background: #1A1210; color: #E6CCAA; border: 2px solid #E6CCAA; font: 700 13px/24px system-ui; text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.35); cursor: pointer !important; }
    .fb-box { position: absolute; z-index: 60; width: 280px; background: #fff; border-radius: 10px; padding: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,.3); display: grid; gap: 8px; font: 14px system-ui, sans-serif; color: #3A2219; }
    .fb-box textarea { min-height: 80px; width: 100%; font: 15px system-ui; padding: 8px; border: 1px solid #DCC8AE; border-radius: 6px; }
    .fb-box .fb-knoepfe { display: flex; gap: 6px; justify-content: flex-end; }
    .fb-box button { min-height: 36px; padding: 0 12px; border-radius: 6px; border: 1px solid #DCC8AE; background: #fff; cursor: pointer !important; }
    .fb-box button.ok { background: #B2573A; border-color: #B2573A; color: #fff; }
    .fb-wo { font-size: 12px; color: #8A6A5A; }
    @media (max-width: 520px) { .fb-leiste { left: 8px; right: 8px; transform: none; flex-wrap: wrap; justify-content: center; } }
  `;
  document.head.appendChild(css);

  const leiste = document.createElement("div");
  leiste.className = "fb-leiste";
  leiste.innerHTML = `<button type="button" data-a="modus"></button><span class="fb-zahl"></span>
    <button type="button" class="fb-kopie" data-a="kopie">Feedback kopieren</button>
    <button type="button" class="fb-leer" data-a="leer">leeren</button>`;
  document.body.appendChild(leiste);

  const ebene = document.createElement("div"); // Markierungen auf der Seite
  ebene.style.cssText = "position:absolute; left:0; top:0; width:0; height:0;";
  document.body.appendChild(ebene);

  const canvas = document.getElementById("bild");
  const vorschau = document.getElementById("vorschau");
  vorschau.style.position = "relative";
  const bildEbene = document.createElement("div"); // Markierungen auf dem Bild (in %)
  bildEbene.style.cssText = "position:absolute; inset:0; pointer-events:none;";
  vorschau.appendChild(bildEbene);

  const ansicht = () => ({ vorlage: data.vorlage, format: data.format });
  const vorlageName = (v) => (v === "naechster" ? "Nächster Termin" : "Weitere Termine");
  const formatName = (f) => (f === "quadrat" ? "Quadrat" : "Hochformat");

  function beschreibe(el) {
    const feld = el.closest(".termin, .karte, .wahl, .aktionen, header");
    const knopf = el.closest("button");
    const label = el.closest("div")?.querySelector("label, .label");
    const teile = [];
    if (feld?.querySelector("h2")) teile.push(`Karte „${feld.closest(".karte")?.querySelector("h2")?.textContent.trim()}“`);
    const termin = el.closest(".termin")?.querySelector("h3")?.textContent.trim();
    if (termin) teile.push(termin);
    if (knopf) teile.push(`Knopf „${knopf.textContent.trim()}“`);
    else if (label) teile.push(`Feld „${label.textContent.trim()}“`);
    else teile.push(`<${el.tagName.toLowerCase()}> „${(el.textContent || "").trim().slice(0, 40)}“`);
    return teile.join(" › ");
  }

  function zeichnen() {
    ebene.replaceChildren();
    bildEbene.replaceChildren();
    const a = ansicht();
    punkte.forEach((p, i) => {
      const pin = document.createElement("div");
      pin.className = "fb-pin";
      pin.textContent = i + 1;
      pin.title = p.text;
      if (p.art === "bild") {
        if (p.vorlage !== a.vorlage || p.format !== a.format) return;
        pin.style.left = (p.x / p.w) * 100 + "%";
        pin.style.top = (p.y / p.h) * 100 + "%";
        pin.style.pointerEvents = "auto";
        bildEbene.appendChild(pin);
      } else {
        pin.style.left = p.px + "px";
        pin.style.top = p.py + "px";
        ebene.appendChild(pin);
      }
      pin.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); bearbeiten(p, e.pageX, e.pageY); });
    });
    const modus = leiste.querySelector('[data-a="modus"]');
    modus.textContent = aktiv ? "Markieren: an" : "Markieren: aus";
    modus.className = aktiv ? "fb-an" : "fb-aus";
    leiste.querySelector(".fb-zahl").textContent = `${punkte.length} Punkt${punkte.length === 1 ? "" : "e"}`;
    document.body.classList.toggle("fb-markieren", aktiv);
  }

  let offeneBox = null;
  function bearbeiten(p, pageX, pageY, neu) {
    if (offeneBox) offeneBox.remove();
    const box = document.createElement("div");
    box.className = "fb-box";
    const wo = p.art === "bild"
      ? `Bild · ${vorlageName(p.vorlage)} · ${formatName(p.format)}`
      : p.wo;
    box.innerHTML = `<div class="fb-wo"></div><textarea placeholder="Was soll anders werden?"></textarea>
      <div class="fb-knoepfe"><button type="button" data-a="weg">${neu ? "Abbrechen" : "Löschen"}</button><button type="button" class="ok" data-a="ok">Speichern</button></div>`;
    box.querySelector(".fb-wo").textContent = wo;
    const ta = box.querySelector("textarea");
    ta.value = p.text || "";
    const breite = 280;
    box.style.left = Math.max(8, Math.min(pageX + 12, document.documentElement.clientWidth - breite - 8)) + "px";
    box.style.top = pageY + 12 + "px";
    document.body.appendChild(box);
    offeneBox = box;
    ta.focus();
    const zu = () => { box.remove(); offeneBox = null; zeichnen(); };
    box.querySelector('[data-a="ok"]').addEventListener("click", () => {
      p.text = ta.value.trim();
      if (!p.text) punkte = punkte.filter((q) => q !== p);
      else if (neu) punkte.push(p);
      sichern(); zu();
    });
    box.querySelector('[data-a="weg"]').addEventListener("click", () => {
      punkte = punkte.filter((q) => q !== p);
      sichern(); zu();
    });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) box.querySelector('[data-a="ok"]').click(); });
  }

  // Klicks im Markier-Modus abfangen, bevor die Seite sie bekommt
  document.addEventListener("click", (e) => {
    if (!aktiv || e.target.closest(".fb-leiste, .fb-box, .fb-pin")) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.target === canvas) {
      const r = canvas.getBoundingClientRect();
      const x = Math.round(((e.clientX - r.left) / r.width) * canvas.width);
      const y = Math.round(((e.clientY - r.top) / r.height) * canvas.height);
      bearbeiten({ art: "bild", ...ansicht(), x, y, w: canvas.width, h: canvas.height, stand: standText() }, e.pageX, e.pageY, true);
    } else {
      bearbeiten({ art: "seite", wo: `Oberfläche · ${beschreibe(e.target)}`, px: e.pageX, py: e.pageY, breite: document.documentElement.clientWidth }, e.pageX, e.pageY, true);
    }
  }, true);
  // Auch Fokus/Eingabe in Formularfeldern im Markier-Modus verhindern
  document.addEventListener("mousedown", (e) => {
    if (aktiv && !e.target.closest(".fb-leiste, .fb-box, .fb-pin")) e.preventDefault();
  }, true);

  function standText() {
    if (data.vorlage === "naechster") return `${terminZeile(data.naechster)} / ${data.naechster.ort}`;
    return data.termine.map((t, i) => `${i + 1}: ${terminZeile(t)} / ${t.ort}${t.geaendert ? " (geändert)" : ""}`).join(" | ");
  }

  function feedbackText() {
    const d = new Date().toLocaleDateString("de-DE");
    const zeilen = [`Feedback One-Bild-Tool (${d}), ${punkte.length} Punkte`, ""];
    punkte.forEach((p, i) => {
      if (p.art === "bild") {
        zeilen.push(`${i + 1}. [Bild · ${vorlageName(p.vorlage)} · ${formatName(p.format)} · x ${p.x} / y ${p.y} von ${p.w}×${p.h}]`);
        zeilen.push(`   ${p.text}`);
        zeilen.push(`   (Eingaben: ${p.stand})`);
      } else {
        zeilen.push(`${i + 1}. [${p.wo} · Fensterbreite ${p.breite}px]`);
        zeilen.push(`   ${p.text}`);
      }
    });
    return zeilen.join("\n");
  }

  leiste.addEventListener("click", async (e) => {
    const a = e.target.closest("button")?.dataset.a;
    if (a === "modus") { aktiv = !aktiv; zeichnen(); }
    if (a === "leer" && punkte.length) {
      // Zweistufig statt confirm(), weil manche Browser-Fenster Dialoge blockieren
      const b = e.target.closest("button");
      if (b.dataset.sicher) {
        punkte = []; sichern(); zeichnen();
        delete b.dataset.sicher; b.textContent = "leeren";
      } else {
        b.dataset.sicher = "1"; b.textContent = "sicher?";
        setTimeout(() => { delete b.dataset.sicher; b.textContent = "leeren"; }, 3000);
      }
    }
    if (a === "kopie") {
      const text = feedbackText();
      try { await navigator.clipboard.writeText(text); }
      catch (err) {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      const b = e.target.closest("button");
      b.textContent = "Kopiert ✓";
      setTimeout(() => (b.textContent = "Feedback kopieren"), 1800);
    }
  });

  // Bei Wechsel von Vorlage/Format die passenden Bild-Markierungen zeigen
  document.querySelectorAll(".wahl").forEach((g) => g.addEventListener("click", () => setTimeout(zeichnen, 0)));
  window.addEventListener("resize", zeichnen);
  zeichnen();
})();
