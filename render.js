/* One · Singkreis – Bild-Renderer (Canvas). Vorschau und Export nutzen dieselbe Zeichnung.
   Maße in "Einheiten" der 2000-px-Vorlage, gemessen an den InDesign-Exporten V08 (Okt. 2026). */

const ONE = {
  terrakotta: "#B2573A",
  schwarz: "#1A1210",
  goldStops: [[0, "#D3AA71"], [0.3, "#E6CCAA"], [0.58, "#D5AE78"], [0.85, "#E6CCAB"], [1, "#DDBB8C"]],
  font: '"Barlow Condensed"',
  cap: 0.7, // Versalhöhe Barlow Condensed in em
};

const FORMATE = {
  quadrat: { w: 2000, h: 2000, k: 1 },
  status: { w: 1080, h: 1920, k: 0.6 }, // Einheitenraum 1800 × 3200
};

const WOCHENTAGE = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

function terminZeile(t) {
  if (!t || !t.datum) return "";
  const [y, m, d] = t.datum.split("-").map(Number);
  const wt = WOCHENTAGE[new Date(y, m - 1, d).getDay()];
  const datum = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
  let zeit = "";
  if (t.von && t.bis) zeit = ` ${t.von} bis ${t.bis} Uhr`;
  else if (t.von) zeit = ` ${t.von} Uhr`;
  return `${wt} ${datum}${zeit}`;
}

/* "*Bitte* Getränk" -> [{t:"Bitte", b:true}, {t:" Getränk", b:false}] */
function parseRich(line) {
  const out = [];
  const re = /\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), b: false });
    out.push({ t: m[1], b: true });
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ t: line.slice(last), b: false });
  return out;
}

const fontStr = (weight, size) => `${weight} ${size}px ${ONE.font}`;

function goldGradient(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [o, c] of ONE.goldStops) g.addColorStop(o, c);
  return g;
}

/* Eine zentrierte Zeile; wird verkleinert, wenn sie breiter als maxW ist. */
function zeile(ctx, text, cx, baseline, o) {
  const segs = parseRich(text);
  if (!segs.length) return;
  const breite = (size) => segs.reduce((w, s) => {
    ctx.font = fontStr(s.b ? 500 : o.weight, size);
    return w + ctx.measureText(s.t).width;
  }, 0);
  let size = o.size;
  let w = breite(size);
  if (o.maxW && w > o.maxW) {
    size = Math.max(o.size * 0.55, size * (o.maxW / w));
    w = breite(size);
  }
  let x = cx - w / 2;
  ctx.fillStyle = o.farbe === "schwarz" ? ONE.schwarz : goldGradient(ctx, x, x + Math.max(w, 1));
  for (const s of segs) {
    ctx.font = fontStr(s.b ? 500 : o.weight, size);
    ctx.fillText(s.t, x, baseline);
    x += ctx.measureText(s.t).width;
  }
}

function goldBand(ctx, cx, top, w, h) {
  ctx.fillStyle = goldGradient(ctx, cx - w / 2, cx + w / 2);
  ctx.fillRect(cx - w / 2, top, w, h);
}

function geisterKreis(ctx, img, g) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.translate(g.cx, g.cy);
  ctx.rotate((g.rot * Math.PI) / 180);
  const h = g.w * (img.height / img.width);
  ctx.drawImage(img, -g.w / 2, -h / 2, g.w, h);
  ctx.restore();
}

/* ---------- Vorlage A: Nächster Termin ---------- */

const WILLKOMMEN = [
  "Willkommen zum *SINGEN*,",
  "das *VERBINDUNG* schafft, das berührt, das",
  "uns führt – in Gemeinschaft zu uns selbst.",
  "Musik aus verschiedenen Traditionen",
];

function vorlageNaechster(ctx, data, UW, UH, assets) {
  const cx = UW / 2;
  const quadrat = UW === UH;
  // Abstände wie im Original; im Hochformat luftiger verteilt
  const luft = quadrat ? 0 : 1;
  const logoTop = 162;
  const bandTop = 1004 + luft * 150;
  const willkommenBase = 1456 + luft * 260;
  const inhaltH = willkommenBase + 3 * 101.5 - logoTop;
  const dy = quadrat ? 0 : (UH - inhaltH) / 2 - 100 - logoTop;

  if (quadrat) geisterKreis(ctx, assets.kreis, { cx: 1313, cy: 1263, w: 1978, rot: -3 });
  else geisterKreis(ctx, assets.kreis, { cx: UW * 0.68, cy: dy + 1500, w: 2500, rot: -3 });

  const lw = 1433, lh = lw * (assets.logo.height / assets.logo.width);
  ctx.drawImage(assets.logo, cx - 713, dy + logoTop - 2, lw, lh);

  const band = { size: 84, weight: 500, farbe: "schwarz", maxW: 1340 };
  goldBand(ctx, cx, dy + bandTop, 1426, 287);
  zeile(ctx, "Nächster Termin:", cx, dy + bandTop + 90, band);
  zeile(ctx, terminZeile(data.termin), cx, dy + bandTop + 184, band);
  zeile(ctx, data.termin.ort || "", cx, dy + bandTop + 268, band);

  WILLKOMMEN.forEach((t, i) => {
    zeile(ctx, t, cx, dy + willkommenBase + i * 101.5, { size: 92, weight: 300, maxW: 1700 });
  });
}

/* ---------- Vorlage B: Weitere Termine (mit Terminänderung im Goldband) ---------- */

function vorlageTermine(ctx, data, UW, UH, assets) {
  const cx = UW / 2;
  const quadrat = UW === UH;
  const T = { size: 92, weight: 500, maxW: 1700 };
  const B = { ...T, farbe: "schwarz", maxW: 1340 };
  const K = { size: 69, weight: 300, maxW: 1700 };
  const luft = quadrat ? 1 : 1.25;

  const termine = data.termine.filter((t) => t.datum || t.ort);
  const n = Math.max(termine.length, 1);
  const titel = `${n > 1 ? "Weitere Termine" : "Weiterer Termin"} für ${data.jahr}:`;
  const hinweis = (data.hinweis || "").split("\n").filter((l) => l.trim());
  const adressen = (data.adressen || "").split("\n").filter((l) => l.trim());

  // Erst Positionen sammeln (y = Grundlinie, relativ), dann mittig setzen und zeichnen
  const ops = [];
  let y = 0;          // letzte Grundlinie bzw. Unterkante des Bandes
  let nach = "text";  // was zuletzt kam: "text" | "band"
  ops.push({ art: "zeile", text: titel, y, o: T });

  for (const t of termine) {
    if (t.geaendert) {
      const top = y + (nach === "band" ? 60 : 86) * luft;
      ops.push({ art: "band", top, h: 379 });
      ops.push({ art: "zeile", text: "ACHTUNG! Terminänderung", y: top + 124, o: B });
      ops.push({ art: "zeile", text: terminZeile(t), y: top + 234, o: B });
      ops.push({ art: "zeile", text: t.ort || "", y: top + 333, o: B });
      y = top + 379;
      nach = "band";
    } else {
      y += (nach === "band" ? 177 : 174) * luft;
      ops.push({ art: "zeile", text: terminZeile(t), y, o: T });
      y += 99;
      ops.push({ art: "zeile", text: t.ort || "", y, o: T });
      nach = "text";
    }
  }
  const kleinBlock = (zeilen) => {
    y += (nach === "band" ? 159 : 155) * luft;
    zeilen.forEach((z, i) => {
      if (i) y += 59;
      ops.push({ art: "zeile", text: z, y, o: K });
    });
    nach = "text";
  };
  if (hinweis.length) kleinBlock(hinweis);
  if (adressen.length) kleinBlock(["*Adressen*", ...adressen]);

  const oben = -T.size * ONE.cap;
  const hoehe = y - oben;

  // Mitte des Inhalts wie im Original bei ca. 1010; Hochformat: Platz für Mini-Logo unten
  let mitte, maxH;
  if (quadrat) { mitte = 1010; maxH = 1640; }
  else { mitte = UH * 0.47; maxH = UH * 0.66; }
  const k = Math.min(1, maxH / hoehe);
  const dy = mitte - (oben + hoehe / 2) * k;

  if (quadrat) geisterKreis(ctx, assets.kreis, { cx: 1372, cy: -420, w: 1938, rot: 156 });
  else geisterKreis(ctx, assets.kreis, { cx: 1180, cy: -180, w: 2400, rot: 156 });

  ctx.save();
  ctx.translate(cx, dy);
  ctx.scale(k, k);
  for (const op of ops) {
    if (op.art === "band") goldBand(ctx, 0, op.top, 1428, op.h);
    else zeile(ctx, op.text, 0, op.y, op.o);
  }
  ctx.restore();

  if (!quadrat) {
    const lw = 560, lh = lw * (assets.logoOhne.height / assets.logoOhne.width);
    ctx.drawImage(assets.logoOhne, cx - lw / 2 - 10, UH - lh - 260, lw, lh);
  }
}

function renderBild(canvas, data, assets) {
  const F = FORMATE[data.format];
  canvas.width = F.w;
  canvas.height = F.h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = ONE.terrakotta;
  ctx.fillRect(0, 0, F.w, F.h);
  ctx.textBaseline = "alphabetic";
  ctx.save();
  ctx.scale(F.k, F.k);
  const UW = F.w / F.k, UH = F.h / F.k;
  if (data.vorlage === "naechster") vorlageNaechster(ctx, data, UW, UH, assets);
  else vorlageTermine(ctx, data, UW, UH, assets);
  ctx.restore();
}
