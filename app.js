/* One · Bilder für WhatsApp – Formular, Speicher, Export */

const ORTE = [
  { kurz: "Marienkapelle", text: "in der Marienkapelle in Bad Neustadt" },
  { kurz: "Kaffee „Steinchen“", text: "im Kaffee „Steinchen“ in Hohenroth" },
  { kurz: "Niederlauer", text: "in Niederlauer (Wiesenmühle 1)" },
  { kurz: "Leutershausen", text: "in Leutershausen (Johann-Klühr-Str. 12)" },
];

const STANDARD = {
  vorlage: "naechster",
  format: "quadrat",
  jahr: "2026",
  naechster: { datum: "2026-10-09", von: "18:30", bis: "20:00", ort: "in Niederlauer (Wiesenmühle 1)" },
  termine: [
    { datum: "2026-11-04", von: "18:00", bis: "19:30", ort: "in der Marienkapelle in Bad Neustadt", geaendert: false },
    { datum: "2026-12-18", von: "18:00", bis: "19:30", ort: "im Kaffee „Steinchen“ in Hohenroth", geaendert: false },
  ],
  hinweis: "*Bitte* Getränk und Sitzkissen mitbringen.\nKeine Anmeldung notwendig.",
  adressen: ["Bad Neustadt: Marienkapelle", "Hohenroth: Hinterm Dorf 12"],
};

const SPEICHER = "one-bilder-v1";

// Jahr in der Überschrift: dieses Jahr und die nächsten 10
const JAHRE = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() + i));
const jahrFeld = document.querySelector("#jahr");
JAHRE.forEach((j) => jahrFeld.append(new Option(j, j)));
let data = laden();
let assets = null;

function laden() {
  try {
    const s = JSON.parse(localStorage.getItem(SPEICHER));
    if (s && s.vorlage) {
      // Ältere Speicherstände hatten die Adressen als Freitext
      if (typeof s.adressen === "string") s.adressen = s.adressen.split("\n").filter((z) => z.trim());
      if (Array.isArray(s.adressen)) s.adressen = s.adressen.slice(0, 3);
      return { ...structuredClone(STANDARD), ...s };
    }
  } catch (e) {}
  return structuredClone(STANDARD);
}
function sichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify(data)); } catch (e) {}
}

const $ = (s) => document.querySelector(s);
const canvas = $("#bild");

/* ---------- Auswahl-Knöpfe ---------- */
document.querySelectorAll(".wahl").forEach((grp) => {
  grp.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    data[grp.dataset.feld] = b.dataset.wert;
    aktualisieren();
  });
});

/* ---------- Termin-Felder ---------- */
function terminFeld(t, opts) {
  const el = $("#terminTpl").content.firstElementChild.cloneNode(true);
  el.querySelector("h3").textContent = opts.titel || "";
  el.querySelector(".termin-kopf").hidden = !opts.titel;
  el.querySelector(".entfernen").hidden = !opts.entfernen;
  el.querySelector(".check").hidden = !opts.aenderung;

  // Eindeutige IDs für Label-Verknüpfung
  el.querySelectorAll("[data-k]").forEach((inp) => {
    const id = `f${Math.random().toString(36).slice(2, 8)}`;
    inp.id = id;
    const lab = inp.closest("div")?.querySelector("label");
    if (lab && inp.type !== "checkbox") lab.htmlFor = id;
    if (inp.type === "checkbox") inp.checked = !!t.geaendert;
    else inp.value = t[inp.dataset.k] || "";
    inp.addEventListener("input", () => {
      if (inp.type === "checkbox") {
        // Nur ein Goldband pro Bild
        if (inp.checked && opts.alle) opts.alle.forEach((o) => { if (o !== t) o.geaendert = false; });
        t.geaendert = inp.checked;
        if (opts.alle) termineAufbauen();
      } else {
        t[inp.dataset.k] = inp.value;
        if (inp.dataset.k === "datum" && opts.alle && opts.alle[0] === t && inp.value) {
          const jahr = inp.value.slice(0, 4);
          if (JAHRE.includes(jahr)) data.jahr = jahr;
        }
      }
      aktualisieren(false);
    });
  });

  const orte = el.querySelector(".orte");
  ORTE.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = o.kurz;
    b.addEventListener("click", () => {
      t.ort = o.text;
      el.querySelector('[data-k="ort"]').value = o.text;
      aktualisieren(false);
    });
    orte.appendChild(b);
  });

  el.querySelector(".entfernen").addEventListener("click", opts.entfernen || (() => {}));
  return el;
}

function naechsterAufbauen() {
  const box = $("#naechsterTermin");
  box.replaceChildren(terminFeld(data.naechster, {}));
}

function termineAufbauen() {
  const box = $("#terminListe");
  box.replaceChildren();
  data.termine.forEach((t, i) => {
    box.appendChild(terminFeld(t, {
      titel: `Termin ${i + 1}`,
      aenderung: true,
      alle: data.termine,
      entfernen: data.termine.length > 1 ? () => { data.termine.splice(i, 1); termineAufbauen(); aktualisieren(false); } : null,
    }));
  });
  $("#terminPlus").hidden = data.termine.length >= 3;
}

$("#terminPlus").addEventListener("click", () => {
  if (data.termine.length >= 3) return;
  const letzter = data.termine[data.termine.length - 1] || {};
  data.termine.push({ datum: "", von: letzter.von || "18:00", bis: letzter.bis || "19:30", ort: "", geaendert: false });
  termineAufbauen();
  aktualisieren(false);
});

jahrFeld.addEventListener("change", () => { data.jahr = jahrFeld.value; aktualisieren(); });

const ADRESSEN = [
  "Bad Neustadt: Marienkapelle",
  "Hohenroth: Hinterm Dorf 12",
  "Niederlauer: Wiesenmühle 1",
  "Leutershausen: Johann-Klühr-Str. 12",
];

/* Hinweis: frei änderbar, Standardtext jederzeit wiederherstellbar */
const hinweisFeld = $("#hinweis");
hinweisFeld.value = data.hinweis;
hinweisFeld.addEventListener("input", () => { data.hinweis = hinweisFeld.value; aktualisieren(false); });
$("#hinweisStandard").addEventListener("click", () => {
  data.hinweis = STANDARD.hinweis;
  hinweisFeld.value = data.hinweis;
  aktualisieren();
});

/* Adressen: eine Zeile pro Adresse, höchstens 3 (wie die Termine) */
const MAX_ADRESSEN = 3;
function adressenAufbauen() {
  const box = $("#adressListe");
  box.replaceChildren();
  data.adressen.forEach((a, i) => {
    const zeile = document.createElement("div");
    zeile.className = "adresse";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = a;
    inp.placeholder = "z. B. Hohenroth: Hinterm Dorf 12";
    inp.setAttribute("aria-label", `Adresse ${i + 1}`);
    inp.addEventListener("input", () => { data.adressen[i] = inp.value; aktualisieren(false); });
    const weg = document.createElement("button");
    weg.type = "button";
    weg.className = "entfernen";
    weg.textContent = "entfernen";
    weg.addEventListener("click", () => { data.adressen.splice(i, 1); adressenAufbauen(); aktualisieren(); });
    zeile.append(inp, weg);
    box.appendChild(zeile);
  });
  // Bekannte Adressen immer zur Auswahl: antippen = rein, nochmal = raus
  const voll = data.adressen.length >= MAX_ADRESSEN;
  const vorschlaege = $("#adressVorschlaege");
  vorschlaege.replaceChildren();
  ADRESSEN.forEach((a) => {
    const drin = data.adressen.includes(a);
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = a;
    b.setAttribute("aria-pressed", String(drin));
    b.disabled = !drin && voll;
    b.addEventListener("click", () => {
      if (drin) data.adressen = data.adressen.filter((x) => x !== a);
      else data.adressen.push(a);
      adressenAufbauen();
      aktualisieren();
    });
    vorschlaege.appendChild(b);
  });
  $("#adressePlus").hidden = voll;
}
$("#adressePlus").addEventListener("click", () => {
  if (data.adressen.length >= MAX_ADRESSEN) return;
  data.adressen.push("");
  adressenAufbauen();
  aktualisieren();
  const felder = document.querySelectorAll("#adressListe input");
  felder[felder.length - 1]?.focus();
});

/* ---------- Anzeige ---------- */
let geplant = false;
function aktualisieren() {
  document.querySelectorAll(".wahl").forEach((grp) => {
    grp.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(data[grp.dataset.feld] === b.dataset.wert)));
  });
  if (!JAHRE.includes(data.jahr)) jahrFeld.append(new Option(data.jahr, data.jahr));
  jahrFeld.value = data.jahr;
  $("#hinweisStandard").hidden = data.hinweis === STANDARD.hinweis;
  const termine = data.vorlage === "termine";
  $("#formNaechster").hidden = termine;
  $("#formTermine").hidden = !termine;
  $("#formInfos").hidden = !termine;
  $("#vorschau").classList.toggle("status", data.format === "status");
  sichern();
  if (!assets || geplant) return;
  geplant = true;
  requestAnimationFrame(() => {
    geplant = false;
    renderBild(canvas, renderDaten(), assets);
  });
}

function renderDaten() {
  return {
    vorlage: data.vorlage,
    format: data.format,
    jahr: data.jahr,
    termin: data.naechster,
    termine: data.termine,
    hinweis: data.hinweis,
    adressen: data.adressen.join("\n"),
  };
}

/* ---------- Export ---------- */
function dateiname() {
  const d = new Date();
  const jjmmtt = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const art = data.format === "quadrat" ? "Status_2000x2000px" : "Status_1080x1920px";
  const was = data.vorlage === "naechster" ? "NaechsterTermin" : "Termine";
  return `${jjmmtt}_Singkreis_WhatsApp_${art}_${was}.jpg`;
}

function alsDatei() {
  return new Promise((res) => canvas.toBlob((b) => res(new File([b], dateiname(), { type: "image/jpeg" })), "image/jpeg", 0.92));
}

$("#teilen").addEventListener("click", async () => {
  const datei = await alsDatei();
  try {
    await navigator.share({ files: [datei] });
  } catch (e) {
    if (e.name !== "AbortError") herunterladen(datei);
  }
});
$("#speichern").addEventListener("click", async () => herunterladen(await alsDatei()));

function herunterladen(datei) {
  const url = URL.createObjectURL(datei);
  const a = document.createElement("a");
  a.href = url;
  a.download = datei.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- Start ---------- */
function bild(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

(async function start() {
  // Teilen nur anbieten, wo das Gerät Bilder teilen kann (Handy)
  let kannTeilen = false;
  try {
    kannTeilen = !!navigator.canShare && navigator.canShare({ files: [new File(["x"], "t.jpg", { type: "image/jpeg" })] });
  } catch (e) {}
  if (!kannTeilen) {
    $("#teilen").hidden = true;
    $("#speichern").classList.replace("neben", "haupt");
  }

  naechsterAufbauen();
  termineAufbauen();
  adressenAufbauen();
  aktualisieren();

  const [logo, logoOhne, kreis] = await Promise.all([
    bild("assets/logo.png"), bild("assets/logo-ohne-claim.png"), bild("assets/kreis.png"),
    document.fonts.load('300 50px "Barlow Condensed"'), document.fonts.load('500 50px "Barlow Condensed"'),
  ]);
  assets = { logo, logoOhne, kreis };
  aktualisieren();
})();
