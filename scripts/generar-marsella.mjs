// Mazo de Marsella original de Diana Arcana: diseño propio inspirado en la tradición marsellesa (siglos XVII-XVIII, dominio público).
// Uso: node generar.mjs <carpeta-salida>
import { writeFileSync, mkdirSync } from "node:fs";
const OUT = process.argv[2] || "./out";
mkdirSync(OUT, { recursive: true });

const R = "#c0392b", A = "#2a5ca8", Y = "#e8b730", C = "#f4e8cc", K = "#1c1424", P = "#f1c9a0", V = "#6f9e3f", CE = "#8fc3e0", CR = "#f8f1df";
const W = 300, H = 527, CX = 150, CY = 262;

const f = (n) => +n.toFixed(1);
const rot = (x, y, a, cx = CX, cy = CY) => { const r = (a * Math.PI) / 180, dx = x - cx, dy = y - cy; return [f(cx + dx * Math.cos(r) - dy * Math.sin(r)), f(cy + dx * Math.sin(r) + dy * Math.cos(r))]; };

function carta(num, nombre, cuerpo) {
  const largo = nombre.length > 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><pattern id="pt" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r=".7" fill="#e3d2ad"/></pattern>
<clipPath id="area"><rect x="20" y="62" width="260" height="401"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="${C}"/><rect width="${W}" height="${H}" fill="url(#pt)"/>
<g clip-path="url(#area)" stroke="${K}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${cuerpo}</g>
<rect x="20" y="18" width="260" height="491" rx="3" fill="none" stroke="${K}" stroke-width="3"/>
<rect x="20" y="18" width="260" height="44" fill="${C}" stroke="${K}" stroke-width="3"/>
<text x="150" y="49" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="25" font-weight="700" fill="${K}" letter-spacing="3">${num}</text>
<rect x="20" y="463" width="260" height="46" fill="${C}" stroke="${K}" stroke-width="3"/>
<text x="150" y="494" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${largo ? 17 : 20}" font-weight="700" fill="${K}" letter-spacing="${largo ? 1.2 : 2.5}"${nombre.length > 19 ? ' textLength="244" lengthAdjust="spacingAndGlyphs"' : ""}>${nombre}</text>
</svg>`;
}

// ---------- piezas ----------
const suelo = (y = 440, col = V) => `<path d="M20 ${y} q65 -10 130 0 t130 0 V465 H20z" fill="${col}"/><path d="M40 ${y + 8} l6 -8 M80 ${y + 10} l4 -9 M210 ${y + 8} l5 -9 M250 ${y + 10} l4 -8" fill="none"/>`;
const corona = (x, y, s = 1, col = Y) => `<path d="M${x - 15 * s} ${y} l${3 * s} ${-16 * s} l${6 * s} ${9 * s} l${6 * s} ${-13 * s} l${6 * s} ${13 * s} l${6 * s} ${-9 * s} l${3 * s} ${16 * s}z" fill="${col}"/><circle cx="${x}" cy="${y - 13 * s}" r="${2.5 * s}" fill="${R}"/>`;
const sombrero = (x, y, s = 1, col = R) => `<path d="M${x - 30 * s} ${y + 2} q${30 * s} ${-14 * s} ${60 * s} 0 q${-30 * s} ${8 * s} ${-60 * s} 0z" fill="${col}"/><path d="M${x - 14 * s} ${y - 3 * s} q${14 * s} ${-26 * s} ${28 * s} 0z" fill="${col}"/>`;
const tiara = (x, y, s = 1) => `<path d="M${x - 13 * s} ${y} q${-2 * s} ${-34 * s} ${13 * s} ${-42 * s} q${15 * s} ${8 * s} ${13 * s} ${42 * s}z" fill="${Y}"/><path d="M${x - 13 * s} ${y - 12 * s} h${26 * s} M${x - 12 * s} ${y - 24 * s} h${24 * s}" fill="none"/><circle cx="${x}" cy="${y - 45 * s}" r="${3 * s}" fill="${R}"/>`;
const capucha = (x, y, s, col) => `<path d="M${x - 20 * s} ${y + 12 * s} q${-4 * s} ${-36 * s} ${20 * s} ${-38 * s} q${24 * s} ${2 * s} ${20 * s} ${38 * s}z" fill="${col}"/>`;
const cabeza = (x, y, s = 1, o = {}) => {
  const r = 14 * s;
  let h = "";
  if (o.pelo) h += `<path d="M${x - r - 2} ${y + r * 1.4} q${-4} ${-r * 2.6} ${r + 2} ${-r * 2.4} q${r * 1.4} ${-r * 0.2} ${r + 4} ${r * 2.4}z" fill="${o.pelo}"/>`;
  if (o.capucha) h += capucha(x, y, s, o.capucha);
  h += `<circle cx="${x}" cy="${y}" r="${r}" fill="${P}"/>`;
  h += `<circle cx="${f(x - 5 * s)}" cy="${f(y - 1 * s)}" r="${f(1.4 * s)}" fill="${K}" stroke="none"/><circle cx="${f(x + 5 * s)}" cy="${f(y - 1 * s)}" r="${f(1.4 * s)}" fill="${K}" stroke="none"/>`;
  h += `<path d="M${f(x - 4 * s)} ${f(y + 6 * s)} q${4 * s} ${3 * s} ${8 * s} 0" fill="none" stroke-width="1.8"/>`;
  if (o.barba) h += `<path d="M${x - r + 2} ${y + 3 * s} q${r - 2} ${r * 2.2} ${2 * r - 4} 0 q${-(r - 2)} ${r * 0.7} ${-(2 * r - 4)} 0z" fill="${o.barba}"/>`;
  if (o.gorro === "corona") h += corona(x, y - r + 2, s);
  if (o.gorro === "sombrero") h += sombrero(x, y - r + 3, s, o.gorroCol || R);
  if (o.gorro === "tiara") h += tiara(x, y - r + 4, s);
  if (o.gorro === "gorra") h += `<path d="M${x - r} ${y - 4 * s} q${r} ${-r * 1.6} ${2 * r} 0z" fill="${o.gorroCol || R}"/>`;
  return h;
};
const mano = (x, y, s = 1) => `<circle cx="${x}" cy="${y}" r="${f(5 * s)}" fill="${P}"/>`;
const brazo = (x1, y1, x2, y2, col, s = 1) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${K}" stroke-width="${f(11 * s)}"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${col}" stroke-width="${f(7 * s)}"/>${mano(x2, y2, s)}`;

// Persona de pie: x, pies en y. o: tunica, manto, s, manos [[x,y],[x,y]], cabeza opts, piernas
function persona(x, y, o = {}) {
  const s = o.s || 1, t = o.tunica || A, hy = y - 160 * s, hom = y - 136 * s;
  let g = "";
  if (o.manto) g += `<path d="M${x - 22 * s} ${hom} q${-14 * s} ${50 * s} ${-26 * s} ${100 * s} h${96 * s} q${-12 * s} ${-50 * s} ${-26 * s} ${-100 * s}z" fill="${o.manto}"/>`;
  g += `<path d="M${x - 9 * s} ${y - 40 * s} v${40 * s} M${x + 9 * s} ${y - 40 * s} v${40 * s}" stroke-width="${f(4 * s)}" fill="none"/>`;
  g += `<path d="M${x - 14 * s} ${y} h${-10 * s} M${x + 14 * s} ${y} h${10 * s}" stroke-width="${f(5 * s)}"/>`;
  g += `<path d="M${x - 18 * s} ${hom} L${x - 30 * s} ${y - 36 * s} H${x + 30 * s} L${x + 18 * s} ${hom} q${-18 * s} ${-8 * s} ${-36 * s} 0z" fill="${t}"/>`;
  if (o.cinto !== false) g += `<path d="M${x - 23 * s} ${y - 92 * s} h${46 * s}" stroke="${o.cinto || Y}" stroke-width="${f(5 * s)}"/>`;
  const [mi, md] = o.manos || [[x - 34 * s, y - 80 * s], [x + 34 * s, y - 80 * s]];
  g += brazo(x - 16 * s, hom + 6 * s, mi[0], mi[1], o.mangas || t, s) + brazo(x + 16 * s, hom + 6 * s, md[0], md[1], o.mangas || t, s);
  g += `<path d="M${x} ${hom} v${-8 * s}" stroke-width="${f(6 * s)}"/>`;
  g += cabeza(x, hy, s, o.cabeza || {});
  return g;
}
// Persona sentada en trono
function sentada(x, y, o = {}) {
  const s = o.s || 1, t = o.tunica || A, hy = y - 150 * s, hom = y - 126 * s;
  let g = o.trono === "none" ? "" : `<rect x="${x - 46 * s}" y="${y - 175 * s}" width="${92 * s}" height="${150 * s}" rx="${6 * s}" fill="${o.trono || Y}"/>`;
  if (o.trono !== "none") g += `<circle cx="${x - 46 * s}" cy="${y - 175 * s}" r="${7 * s}" fill="${o.trono || Y}"/><circle cx="${x + 46 * s}" cy="${y - 175 * s}" r="${7 * s}" fill="${o.trono || Y}"/>`;
  if (o.manto) g += `<path d="M${x - 22 * s} ${hom} q${-24 * s} ${60 * s} ${-30 * s} ${120 * s} h${104 * s} q${-6 * s} ${-60 * s} ${-30 * s} ${-120 * s}z" fill="${o.manto}"/>`;
  g += `<path d="M${x - 18 * s} ${hom} L${x - 26 * s} ${y - 62 * s} L${x - 40 * s} ${y - 8 * s} H${x + 40 * s} L${x + 26 * s} ${y - 62 * s} L${x + 18 * s} ${hom} q${-18 * s} ${-8 * s} ${-36 * s} 0z" fill="${t}"/>`;
  g += `<path d="M${x - 26 * s} ${y - 62 * s} H${x + 26 * s}" fill="none"/>`;
  g += `<path d="M${x - 30 * s} ${y - 6 * s} h${-12 * s} M${x + 30 * s} ${y - 6 * s} h${12 * s}" stroke-width="${f(6 * s)}"/>`;
  const [mi, md] = o.manos || [[x - 30 * s, y - 72 * s], [x + 30 * s, y - 72 * s]];
  g += brazo(x - 16 * s, hom + 6 * s, mi[0], mi[1], o.mangas || t, s) + brazo(x + 16 * s, hom + 6 * s, md[0], md[1], o.mangas || t, s);
  g += `<path d="M${x} ${hom} v${-8 * s}" stroke-width="${f(6 * s)}"/>`;
  g += cabeza(x, hy, s, o.cabeza || {});
  return g;
}
function caballo(x, y, col = CR, s = 1) {
  return `<path d="M${x - 50 * s} ${y - 40 * s} q${-30 * s} ${10 * s} ${-34 * s} ${44 * s}" fill="none" stroke-width="${f(6 * s)}"/>
  <path d="M${x - 40 * s} ${y - 30 * s} v${60 * s} M${x - 22 * s} ${y - 30 * s} v${62 * s} M${x + 32 * s} ${y - 30 * s} v${60 * s} M${x + 48 * s} ${y - 34 * s} l${14 * s} ${48 * s}" stroke-width="${f(7 * s)}" fill="none"/>
  <ellipse cx="${x}" cy="${y - 48 * s}" rx="${60 * s}" ry="${28 * s}" fill="${col}"/>
  <path d="M${x + 40 * s} ${y - 62 * s} q${10 * s} ${-40 * s} ${28 * s} ${-60 * s} l${26 * s} ${18 * s} q${4 * s} ${8 * s} ${-6 * s} ${12 * s} l${-14 * s} ${-4 * s} q${-6 * s} ${30 * s} ${-14 * s} ${48 * s}z" fill="${col}"/>
  <path d="M${x + 66 * s} ${y - 122 * s} l${2 * s} ${-12 * s} l${6 * s} ${10 * s}" fill="${col}"/><circle cx="${x + 80 * s}" cy="${y - 106 * s}" r="${1.8 * s}" fill="${K}"/>
  <path d="M${x + 60 * s} ${y - 118 * s} q${-12 * s} ${20 * s} ${-14 * s} ${50 * s}" fill="none" stroke="${R}" stroke-width="${f(5 * s)}"/>
  <path d="M${x - 24 * s} ${y - 74 * s} q${24 * s} ${-6 * s} ${48 * s} 0 v${30 * s} q${-24 * s} ${8 * s} ${-48 * s} 0z" fill="${R}"/>`;
}
const estrella = (x, y, r, col = Y, n = 8) => { let p = ""; for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; p += `${f(x + rr * Math.cos(a))},${f(y + rr * Math.sin(a))} `; } return `<polygon points="${p}" fill="${col}"/>`; };
const sol = (x, y, r, cara = true) => {
  let g = ""; for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, l = r * (i % 2 ? 1.35 : 1.75), w = i % 2 ? 0.13 : 0.11, pt = (rr, d) => `${f(x + rr * Math.cos(a + d))},${f(y + rr * Math.sin(a + d))}`; g += `<polygon points="${pt(r, -w)} ${pt(l, 0)} ${pt(r, w)}" fill="${i % 2 ? R : Y}"/>`; }
  g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${Y}"/>`;
  if (cara) g += `<path d="M${x - r * .4} ${y - r * .15} q${r * .13} ${-r * .12} ${r * .26} 0 M${x + r * .14} ${y - r * .15} q${r * .13} ${-r * .12} ${r * .26} 0 M${x - r * .25} ${y + r * .4} q${r * .25} ${r * .18} ${r * .5} 0" fill="none"/>`;
  return g;
};
const gota = (x, y, c) => `<path d="M${x} ${y - 9} q7 9 0 14 q-7 -5 0 -14z" fill="${c}"/>`;
const nube = (x, y, s = 1) => `<path d="M${x - 50 * s} ${y} q${-10 * s} ${-24 * s} ${14 * s} ${-26 * s} q${10 * s} ${-22 * s} ${34 * s} ${-12 * s} q${20 * s} ${-16 * s} ${36 * s} ${4 * s} q${26 * s} ${-2 * s} ${18 * s} ${34 * s}z" fill="${CE}"/>`;
const alas = (x, y, s, col = R) => `<path d="M${x - 10 * s} ${y} q${-60 * s} ${-30 * s} ${-56 * s} ${30 * s} q${20 * s} ${20 * s} ${50 * s} ${30 * s}z M${x + 10 * s} ${y} q${60 * s} ${-30 * s} ${56 * s} ${30 * s} q${-20 * s} ${20 * s} ${-50 * s} ${30 * s}z" fill="${col}"/>`;
const hojas = (x, y, a = 0, col = V) => `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} q10 -14 0 -26 q-10 12 0 26z" fill="${col}"/>`;

// ---------- emblemas de los palos ----------
const copa = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 -30 h44 q0 30 -22 36 q-22 -6 -22 -36z" fill="${Y}"/><path d="M-22 -30 h44" stroke-width="4"/><rect x="-4" y="6" width="8" height="16" fill="${R}"/><path d="M-18 30 q18 -14 36 0z" fill="${A}"/></g>`;
const oro = (x, y, s = 1) => { let p = ""; for (let i = 0; i < 6; i++) p += `<ellipse cx="0" cy="-12" rx="5" ry="12" transform="rotate(${i * 60})" fill="${i % 2 ? R : A}"/>`; return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="30" fill="${Y}"/><circle r="24" fill="none" stroke-width="2"/>${p}<circle r="6" fill="${Y}"/></g>`; };
const espada = (x, y, a, L = 300, s = 1) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M${-5 * s} ${L / 2 - 46 * s} L${-5 * s} ${-L / 2 + 22} L0 ${-L / 2} L${5 * s} ${-L / 2 + 22} L${5 * s} ${L / 2 - 46 * s}z" fill="${CE}"/><path d="M0 ${-L / 2 + 26} V${L / 2 - 50 * s}" stroke-width="1.2" fill="none"/><rect x="${-22 * s}" y="${L / 2 - 48 * s}" width="${44 * s}" height="${9 * s}" rx="3" fill="${Y}"/><rect x="${-4 * s}" y="${L / 2 - 39 * s}" width="${8 * s}" height="${28 * s}" fill="${R}"/><circle cx="0" cy="${L / 2 - 8 * s}" r="${7 * s}" fill="${Y}"/></g>`;
const basto = (x, y, a, L = 300, s = 1) => `<g transform="translate(${x} ${y}) rotate(${a})"><rect x="${-7 * s}" y="${-L / 2}" width="${14 * s}" height="${L}" rx="${7 * s}" fill="${R}"/><path d="M${-7 * s} ${-L / 2 + 24} h${14 * s} M${-7 * s} ${L / 2 - 24} h${14 * s}" fill="none"/><path d="M${-7 * s} ${-L / 2 + 12} h${14 * s}" stroke="${Y}" stroke-width="5"/><path d="M${-7 * s} ${L / 2 - 12} h${14 * s}" stroke="${Y}" stroke-width="5"/><path d="M0 ${-L / 2 + 36} V${L / 2 - 36}" stroke="${Y}" stroke-width="2" fill="none"/></g>`;
const EMBLEMA = { copas: copa, oros: oro, espadas: (x, y, s = 1) => espada(x, y, 0, 120 * s, s * 0.8), bastos: (x, y, s = 1) => basto(x, y, 0, 120 * s, s * 0.8) };

// ---------- cartas de números ----------
const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
const NUM = ["As", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"];
const POS = {
  2: [[150, 165], [150, 360]], 3: [[150, 125], [150, 262], [150, 400]], 4: [[95, 150], [205, 150], [95, 375], [205, 375]],
  5: [[95, 140], [205, 140], [150, 262], [95, 385], [205, 385]], 6: [[95, 125], [205, 125], [95, 262], [205, 262], [95, 400], [205, 400]],
  7: [[95, 120], [205, 120], [150, 190], [95, 262], [205, 262], [95, 405], [205, 405]],
  8: [[95, 110], [205, 110], [95, 205], [205, 205], [95, 320], [205, 320], [95, 415], [205, 415]],
  9: [[95, 110], [205, 110], [95, 200], [205, 200], [150, 262], [95, 325], [205, 325], [95, 415], [205, 415]],
  10: [[95, 105], [205, 105], [150, 160], [95, 210], [205, 210], [95, 315], [205, 315], [150, 365], [95, 420], [205, 420]],
};
const adorno = (n) => n % 2 === 0 || n < 4 ? `<path d="M150 80 v${n === 2 ? 370 : 0}" fill="none" stroke="${A}" stroke-width="3"/>` : "";
function pips(palo, n) {
  if (palo === "copas" || palo === "oros") {
    const s = n >= 7 ? 0.82 : 1, fn = palo === "copas" ? copa : oro;
    let g = "";
    if (n === 2 && palo === "oros") g += `<path d="M150 125 C60 210 240 315 150 400" fill="none" stroke="${R}" stroke-width="12"/><path d="M150 125 C60 210 240 315 150 400" fill="none" stroke="${Y}" stroke-width="6"/>`;
    if (n % 2 === 0 && palo === "copas") g += `<path d="M150 90 v345" fill="none" stroke="${A}" stroke-width="3"/>` + hojas(150, 262, -60, A) + hojas(150, 262, 60, A) + `<circle cx="150" cy="${n === 4 ? 262 : 262}" r="9" fill="${R}"/>`;
    if (n % 2 === 0 && palo === "oros" && n > 2) g += hojas(150, 280, -50) + hojas(150, 280, 50) + hojas(150, 280, 180);
    return g + POS[n].map(([x, y]) => fn(x, y, s)).join("");
  }
  // espadas y bastos: dos haces paralelos que se cruzan en celosía (estilo marsellés) + uno al centro si es impar
  const fn = palo === "espadas" ? espada : basto, m = Math.floor(n / 2), sep = m > 3 ? 27 : 32, ang = 20;
  let g = "";
  if (palo === "espadas") {
    // espadas curvas en óvalo, como en los mazos marselleses
    const curva = (lado, k) => { const bx = CX + lado * (20 + k * 24), tx = CX - lado * (14 + k * 16), cx = CX + lado * (78 + k * 24), d = `M${bx} 410 Q${cx} 255 ${tx} 92`;
      return `<path d="${d}" fill="none" stroke="${K}" stroke-width="11"/><path d="${d}" fill="none" stroke="${CE}" stroke-width="6"/><rect x="${bx - 13}" y="408" width="26" height="7" rx="3" fill="${Y}"/><rect x="${bx - 3.5}" y="415" width="7" height="22" fill="${R}"/><circle cx="${bx}" cy="442" r="5.5" fill="${Y}"/>`; };
    for (let k = m - 1; k >= 0; k--) g += curva(-1, k) + curva(1, k);
    if (n % 2) g += espada(CX, 262, 0, 360, 1);
    else g += hojas(150, 290, -50) + hojas(150, 290, 50) + `<circle cx="150" cy="290" r="9" fill="${R}"/>`;
    return g + hojas(40, 90, -45) + hojas(260, 90, 45);
  }
  for (let k = 0; k < m; k++) { const dx = (k - (m - 1) / 2) * sep; g += fn(CX + dx, CY, -ang, 320) + fn(CX + dx, CY, ang, 320); }
  if (n % 2) g += fn(CX, CY, 0, 340);
  g += hojas(40, 90, -45) + hojas(260, 90, 45) + hojas(40, 440, -135) + hojas(260, 440, 135);
  return g;
}
function as(palo) {
  if (palo === "copas") return `<path d="M100 150 h100 l-8 -24 h-12 v12 h-12 v-12 h-12 v12 h-12 v-12 h-12 v12 h-12 v-12 h-12z" fill="${Y}"/>
    <path d="M90 150 h120 q0 95 -60 112 q-60 -17 -60 -112z" fill="${Y}"/><path d="M98 170 h104" fill="none"/><path d="M120 200 q30 20 60 0" fill="none" stroke="${R}" stroke-width="4"/>
    <rect x="138" y="262" width="24" height="70" fill="${R}"/><circle cx="150" cy="295" r="16" fill="${A}"/><path d="M90 400 q60 -80 120 0z" fill="${A}"/><path d="M100 400 h100" fill="none"/>
    ${hojas(70, 300, -40)}${hojas(230, 300, 40)}${hojas(150, 110, 0, R)}`;
  if (palo === "oros") return `<path d="M150 330 q-70 30 -90 100 M150 330 q70 30 90 100 M150 330 v105" fill="none" stroke-width="3"/>${hojas(70, 400, -110)}${hojas(230, 400, 110)}${oro(150, 235, 3)}${hojas(150, 115, 0, R)}`;
  if (palo === "espadas") return `<path d="M75 230 q-30 -60 20 -110 M225 230 q30 -60 -20 -110" fill="none" stroke="${V}" stroke-width="5"/>${hojas(70, 180, -30)}${hojas(230, 180, 30)}${hojas(85, 140, -10)}${hojas(215, 140, 10)}
    ${espada(150, 280, 0, 330, 1.3)}${corona(150, 150, 2.4)}${gota(90, 300, R)}${gota(210, 300, A)}${gota(100, 360, Y)}${gota(200, 360, R)}`;
  return `${nube(110, 440, 1.1)}<path d="M120 410 q-6 -30 14 -36 l26 -4 q14 4 8 24 l-6 20z" fill="${P}"/><path d="M118 420 h52 v20 h-52z" fill="${A}"/>
    <path d="M136 395 L128 120 q22 -18 44 0 L164 395z" fill="${R}"/><path d="M134 300 h32 M132 220 h36 M130 150 h40" fill="none"/>
    ${hojas(130, 180, -60)}${hojas(170, 250, 60)}${hojas(128, 270, -70)}${hojas(170, 160, 60)}${gota(85, 140, R)}${gota(215, 140, A)}${gota(80, 230, Y)}${gota(220, 230, R)}`;
}

// ---------- figuras ----------
function corte(palo, rango) {
  const em = EMBLEMA[palo], tun = { copas: A, oros: R, espadas: R, bastos: A }[palo], mt = tun === A ? R : A;
  if (rango === "Sota") return suelo(445) + persona(150, 448, { s: 1.6, tunica: tun, manto: Y, cabeza: { gorro: "sombrero", gorroCol: mt, pelo: Y }, manos: [[110, 270], [196, 250]] }) + em(palo === "espadas" || palo === "bastos" ? 205 : 110, palo === "espadas" || palo === "bastos" ? 190 : 245, 1);
  if (rango === "Caballo") { const esp = palo === "espadas" || palo === "bastos";
    return suelo(445) + caballo(135, 425, CR, 1.2) + persona(132, 382, { s: 0.95, tunica: tun, manto: mt, cabeza: { gorro: "sombrero", gorroCol: Y, pelo: Y }, manos: [[98, 300], [178, 282]] }) +
      `<path d="M100 334 q35 -8 70 0 v50 q-35 10 -70 0z" fill="${R}"/><path d="M100 350 h70" stroke="${Y}" stroke-width="4"/>` + em(esp ? 98 : 96, esp ? 250 : 288, 0.75); }
  if (rango === "Reina") return suelo(448) + sentada(150, 452, { s: 1.55, tunica: tun, manto: mt, trono: Y, cabeza: { gorro: "corona", pelo: Y }, manos: [[112, 320], [190, 330]] }) + em(palo === "espadas" || palo === "bastos" ? 112 : 112, palo === "espadas" || palo === "bastos" ? 270 : 300, 0.95);
  return suelo(448) + sentada(150, 452, { s: 1.55, tunica: tun, manto: mt, trono: Y, cabeza: { gorro: "corona", barba: CR }, manos: [[110, 330], [192, 320]] }) + em(palo === "espadas" || palo === "bastos" ? 192 : 192, palo === "espadas" || palo === "bastos" ? 260 : 290, 0.95);
}

// ---------- arcanos mayores (numeración de Marsella) ----------
const MAYORES = [
  ["El Loco", "EL LOCO", () => suelo(430) + `<path d="M210 450 q15 -40 40 -30 q-4 20 -18 30z" fill="${CR}"/><circle cx="246" cy="418" r="2" fill="${K}"/>` +
    persona(140, 438, { s: 1.5, tunica: Y, manto: R, mangas: A, cabeza: { gorro: "gorra", gorroCol: R, pelo: Y }, manos: [[100, 300], [200, 330]] }) +
    `<path d="M100 300 L60 140" stroke-width="5" fill="none"/><circle cx="56" cy="128" r="18" fill="${A}"/><path d="M200 330 L220 455" stroke="${R}" stroke-width="6"/>` + sol(238, 105, 16, false)],
  ["El Mago", "EL MAGO", () => suelo(445, "#b9d17a") + persona(150, 330, { s: 1.4, tunica: R, mangas: A, manto: Y, cabeza: { gorro: "sombrero", gorroCol: Y, pelo: Y }, manos: [[100, 175], [200, 260]] }) +
    `<path d="M100 175 L80 120" stroke="${CR}" stroke-width="7"/><rect x="40" y="300" width="220" height="24" fill="${Y}"/><path d="M60 324 v115 M240 324 v115 M110 324 v100" stroke-width="7" fill="none"/>` +
    copa(85, 284, 0.5) + oro(130, 288, 0.4) + `<path d="M170 296 l30 -10" stroke="${CE}" stroke-width="5"/><circle cx="225" cy="290" r="8" fill="${R}"/>` + `<path d="M120 105 c-20 -20 -20 20 0 0 c20 -20 20 20 0 0" fill="none" stroke-width="3"/>`],
  ["La Papisa", "LA PAPISA", () => `<path d="M40 70 q110 40 220 0 V300 H40z" fill="${CE}"/>` + sentada(150, 450, { s: 1.6, tunica: R, manto: A, trono: Y, cabeza: { gorro: "tiara", capucha: CR }, manos: [[120, 345], [176, 330]] }) +
    `<path d="M110 320 l40 10 l40 -10 v40 l-40 10 l-40 -10z" fill="${CR}"/><path d="M150 330 v40" fill="none"/><path d="M118 335 h22 M118 345 h22 M160 335 h22 M160 345 h22" stroke-width="1.5" fill="none"/>`],
  ["La Emperatriz", "LA EMPERATRIZ", () => sentada(150, 450, { s: 1.6, tunica: R, manto: A, trono: CE, cabeza: { gorro: "corona", pelo: Y }, manos: [[104, 280], [196, 335]] }) +
    alas(150, 140, 1.4, CE) + `<path d="M104 280 L96 170" stroke-width="5"/>` + estrella(96, 160, 14, Y, 4) + `<path d="M180 300 h44 v40 q-22 30 -44 0z" fill="${Y}"/><path d="M202 306 l-8 14 h16z M196 324 h12" fill="${K}" stroke-width="1.5"/>`],
  ["El Emperador", "EL EMPERADOR", () => suelo(448) + sentada(150, 452, { s: 1.6, tunica: R, manto: A, trono: Y, cabeza: { gorro: "corona", barba: CR }, manos: [[106, 290], [196, 340]] }) +
    `<path d="M106 290 L100 170" stroke-width="5"/><circle cx="100" cy="164" r="12" fill="${Y}"/><path d="M92 158 h16 M100 150 v-12" fill="none"/>` +
    `<path d="M190 400 h50 v40 q-25 30 -50 0z" fill="${Y}"/><path d="M215 405 l-10 18 h20z" fill="${K}"/>`],
  ["El Papa", "EL PAPA", () => sentada(150, 400, { s: 1.5, tunica: R, manto: A, trono: CE, cabeza: { gorro: "tiara", barba: CR }, manos: [[104, 250], [192, 280]] }) +
    `<path d="M104 250 L96 100 M86 120 h20 M84 135 h24 M82 150 h28" stroke="${Y}" stroke-width="5" fill="none"/>` +
    cabeza(80, 440, 1.2, { capucha: R }) + cabeza(220, 440, 1.2, { capucha: A }) + `<path d="M60 465 q20 -24 40 0 M200 465 q20 -24 40 0" fill="${A}"/>`],
  ["El Enamorado", "EL ENAMORADO", () => suelo(445) + sol(150, 100, 22, false) + `<path d="M140 120 q-30 0 -40 30 q10 10 40 0" fill="${CE}"/><path d="M115 130 L170 160" stroke-width="3"/>` +
    persona(150, 448, { s: 1.15, tunica: R, mangas: Y, cabeza: { pelo: Y }, manos: [[110, 330], [190, 330]] }) +
    persona(75, 448, { s: 1.15, tunica: A, manto: R, cabeza: { pelo: K, gorro: "corona" }, manos: [[108, 330], [55, 360]] }) +
    persona(225, 448, { s: 1.15, tunica: Y, manto: A, cabeza: { pelo: Y }, manos: [[192, 330], [245, 360]] })],
  ["El Carro", "EL CARRO", () => suelo(445) + `<path d="M50 180 h200 l-20 -40 h-160z" fill="${R}"/><path d="M70 180 v120 M230 180 v120" stroke="${A}" stroke-width="8"/>` +
    persona(150, 380, { s: 1.2, tunica: A, mangas: R, cabeza: { gorro: "corona", pelo: Y }, manos: [[110, 270], [190, 260]] }) + `<path d="M190 260 L210 200" stroke-width="5"/>` +
    `<rect x="60" y="290" width="180" height="100" fill="${Y}"/><path d="M90 320 h120 M90 350 h120" fill="none"/>` +
    caballo(90, 470, A, 0.7) + caballo(205, 470, R, 0.7)],
  ["La Justicia", "LA JUSTICIA", () => `<rect x="60" y="80" width="180" height="300" fill="${Y}"/><circle cx="60" cy="80" r="12" fill="${Y}"/><circle cx="240" cy="80" r="12" fill="${Y}"/>` +
    sentada(150, 452, { s: 1.6, tunica: R, manto: A, trono: Y, cabeza: { gorro: "corona", pelo: Y }, manos: [[106, 330], [196, 300]] }) +
    `<path d="M106 330 V130" stroke="${CE}" stroke-width="7"/><path d="M106 125 l-5 12 h10z" fill="${CE}"/><path d="M92 318 h28" stroke="${Y}" stroke-width="6"/>` +
    `<path d="M196 300 V250 M166 250 h60" fill="none" stroke-width="3"/><path d="M166 250 l-12 30 h24z M226 250 l-12 30 h24z" fill="${Y}"/>`],
  ["El Ermitaño", "EL ERMITAÑO", () => suelo(445) + persona(150, 448, { s: 1.65, tunica: A, manto: R, mangas: A, cabeza: { capucha: R, barba: CR }, manos: [[84, 230], [205, 320]] }) +
    `<path d="M205 320 L218 455" stroke="${Y}" stroke-width="7"/><rect x="66" y="232" width="32" height="40" rx="4" fill="${Y}"/><path d="M82 232 v-12" fill="none"/>` + estrella(82, 252, 10, R, 6)],
  ["La Rueda de Fortuna", "LA RUEDA DE FORTUNA", () => suelo(445) + `<path d="M110 450 L150 300 L190 450" stroke="${R}" stroke-width="10" fill="none"/>` +
    `<circle cx="150" cy="270" r="95" fill="none" stroke="${Y}" stroke-width="14"/><circle cx="150" cy="270" r="95" fill="none"/><circle cx="150" cy="270" r="18" fill="${R}"/>` +
    [0, 1, 2, 3, 4, 5].map((i) => `<path d="M150 270 L${rot(150, 175, i * 60, 150, 270).join(" ")}" stroke-width="4"/>`).join("") +
    `<path d="M150 270 L200 330 h20" stroke-width="6" fill="none"/>` +
    `<path d="M110 160 q40 -40 80 0 v12 h-80z" fill="${Y}"/>` + cabeza(150, 140, 1, { gorro: "corona" }) + `<path d="M120 172 q-14 30 6 40 M180 172 q14 30 -6 40" stroke="${CE}" stroke-width="6" fill="none"/>` +
    `<ellipse cx="70" cy="290" rx="20" ry="30" fill="${R}" transform="rotate(-30 70 290)"/><circle cx="60" cy="255" r="12" fill="${R}"/><ellipse cx="232" cy="260" rx="20" ry="30" fill="${A}" transform="rotate(30 232 260)"/><circle cx="242" cy="295" r="12" fill="${A}"/>`],
  ["La Fuerza", "LA FUERZA", () => suelo(445) + persona(130, 448, { s: 1.6, tunica: R, manto: A, mangas: Y, cabeza: { gorro: "sombrero", gorroCol: Y, pelo: Y }, manos: [[170, 335], [180, 385]] }) +
    `<ellipse cx="215" cy="410" rx="55" ry="30" fill="${Y}"/><circle cx="190" cy="365" r="34" fill="${Y}"/><circle cx="190" cy="365" r="22" fill="${Y}"/><path d="M175 350 l4 4 M200 350 l-4 4" fill="none"/><path d="M178 375 q12 18 26 0z" fill="${R}"/><path d="M200 438 v22 M240 435 v25" stroke-width="7"/>`],
  ["El Colgado", "EL COLGADO", () => `<path d="M60 80 V465 M240 80 V465" stroke="${V}" stroke-width="18"/><path d="M50 95 H250" stroke="${Y}" stroke-width="16"/>` +
    [100, 150, 210, 260, 320].map((y) => `<path d="M60 ${y} h-12 M240 ${y + 20} h12" stroke="${R}" stroke-width="6"/>`).join("") +
    `<g transform="rotate(180 150 260)">${persona(150, 410, { s: 1.4, tunica: A, mangas: R, cinto: Y, cabeza: { pelo: Y }, manos: [[136, 250], [164, 250]] })}</g><path d="M150 103 v8" stroke-width="3"/>` + `<path d="M141 110 v-8 M159 110 l-8 -10" stroke-width="5"/>`],
  ["Arcano sin nombre", "", () => suelo(420, K) + `<path d="M20 430 V465 H280 V430z" fill="${K}"/>` +
    hojas(60, 440, -20) + hojas(90, 450, 20) + hojas(200, 445, -15) + hojas(240, 450, 15) +
    `<circle cx="140" cy="140" r="24" fill="${CR}"/><circle cx="131" cy="138" r="5" fill="${K}"/><circle cx="149" cy="138" r="5" fill="${K}"/>` +
    `<path d="M140 165 V300 M118 190 h44 M120 210 h40 M122 230 h36 M124 250 h32 M140 300 l-30 120 M140 300 l40 110 M140 180 l-40 70 M140 180 l50 50" stroke="${CR}" stroke-width="7" fill="none"/>` +
    `<path d="M190 230 L210 90" stroke="${R}" stroke-width="6"/><path d="M212 90 q-80 10 -110 70 q50 -40 110 -50z" fill="${CE}"/>`],
  ["La Templanza", "LA TEMPLANZA", () => suelo(445) + alas(150, 230, 1.6, R) + persona(150, 448, { s: 1.6, tunica: A, manto: R, mangas: R, cabeza: { pelo: Y }, manos: [[100, 290], [205, 360]] }) +
    `<path d="M88 270 h26 l-4 40 h-18z" fill="${R}"/><path d="M194 350 h26 l-4 40 h-18z" fill="${A}"/><path d="M110 300 q60 10 90 55" stroke="${CE}" stroke-width="6" fill="none"/>` + estrella(150, 100, 9, Y, 5)],
  ["El Diablo", "EL DIABLO", () => `<path d="M40 300 q110 -50 220 0 V465 H40z" fill="${K}" opacity=".12"/>` + alas(150, 180, 1.7, A) +
    persona(150, 340, { s: 1.4, tunica: R, mangas: P, cinto: Y, cabeza: { pelo: K }, manos: [[100, 180], [200, 260]] }) +
    `<path d="M136 116 l-12 -30 l20 18z M164 116 l12 -30 l-20 18z" fill="${Y}"/><path d="M100 180 L96 130" stroke-width="5"/><circle cx="96" cy="124" r="8" fill="${Y}"/>` +
    `<rect x="100" y="340" width="100" height="40" fill="${Y}"/>` + persona(80, 448, { s: 0.75, tunica: R, cabeza: { gorro: "gorra", gorroCol: A } }) + persona(220, 448, { s: 0.75, tunica: A, cabeza: { gorro: "gorra", gorroCol: R } }) +
    `<path d="M120 365 Q90 360 82 345 M180 365 Q210 360 218 345" fill="none" stroke-width="2"/>`],
  ["La Torre", "LA TORRE", () => suelo(445) + `<path d="M110 440 V160 H200 V440z" fill="${P}"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M110 ${180 + i * 32} H200 M${i % 2 ? 130 : 150} ${180 + i * 32} v32 M${i % 2 ? 175 : 190} ${180 + i * 32} v32" fill="none" stroke-width="1.5"/>`).join("") +
    `<rect x="140" y="380" width="30" height="60" fill="${A}"/><rect x="125" y="230" width="18" height="26" fill="${A}"/><rect x="168" y="230" width="18" height="26" fill="${A}"/>` +
    `<g transform="rotate(25 200 140)">${corona(190, 160, 2.6, Y)}</g><path d="M280 70 L230 100 L250 110 L195 150" fill="none" stroke="${R}" stroke-width="10"/><path d="M280 70 L230 100 L250 110 L195 150" fill="none" stroke="${Y}" stroke-width="4"/>` +
    `<g transform="rotate(165 72 250)">${persona(72, 250, { s: 0.7, tunica: R, cabeza: {} })}</g><g transform="rotate(-165 232 285)">${persona(232, 285, { s: 0.7, tunica: A, cabeza: {} })}</g>` + [[60, 120, R], [90, 210, A], [240, 230, Y], [50, 260, Y], [250, 300, R]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`).join("")],
  ["La Estrella", "LA ESTRELLA", () => estrella(150, 115, 38, Y, 8) + estrella(150, 115, 24, R, 8) + [[60, 95], [240, 95], [70, 170], [230, 170], [110, 200], [190, 200], [150, 190]].map(([x, y], i) => estrella(x, y, 13, i % 2 ? A : Y, 8)).join("") +
    `<path d="M20 400 q65 -20 130 0 t130 0 V465 H20z" fill="${CE}"/><path d="M220 390 V280" stroke="${V}" stroke-width="6"/>` + hojas(220, 300, -50) + hojas(220, 300, 50) + `<ellipse cx="226" cy="268" rx="12" ry="8" fill="${K}"/>` +
    sentada(130, 430, { s: 1.2, tunica: A, trono: "none", cabeza: { pelo: Y }, manos: [[86, 350], [176, 360]] }) +
    `<path d="M74 340 h24 l-4 30 h-16z" fill="${R}"/><path d="M164 350 h24 l-4 30 h-16z" fill="${R}"/><path d="M80 370 q-10 30 0 40 M176 380 q20 20 30 30" stroke="${A}" stroke-width="5" fill="none"/>`],
  ["La Luna", "LA LUNA", () => `<circle cx="150" cy="120" r="44" fill="${CE}"/><path d="M168 85 a44 44 0 1 1 0 70 a34 38 0 1 0 0 -70z" fill="${Y}"/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<path d="M${rot(150, 66, i * 30, 150, 120).join(" ")} L${rot(150, 54, i * 30, 150, 120).join(" ")}" stroke="${Y}" stroke-width="4"/>`).join("") +
    [[100, 210, R], [130, 225, A], [170, 225, Y], [200, 210, R], [150, 240, A]].map(([x, y, c]) => `<path d="M${x} ${y + 9} q7 -9 0 -14 q-7 5 0 14z" fill="${c}"/>`).join("") +
    `<rect x="30" y="200" width="36" height="120" fill="${Y}"/><rect x="234" y="200" width="36" height="120" fill="${Y}"/><path d="M30 200 v-12 h8 v8 h8 v-8 h8 v8 h8 v-8 h4 v12 M234 200 v-12 h8 v8 h8 v-8 h8 v8 h8 v-8 h4 v12" fill="${Y}"/>` +
    `<path d="M70 360 q10 -40 40 -36 q14 10 10 36z" fill="${CR}"/><path d="M230 360 q-10 -40 -40 -36 q-14 10 -10 36z" fill="${A}"/>` + suelo(360, "#b9d17a") +
    `<path d="M20 400 q130 -16 260 0 V465 H20z" fill="${CE}"/><ellipse cx="150" cy="430" rx="22" ry="14" fill="${R}"/><path d="M128 425 l-14 -10 M172 425 l14 -10" stroke="${R}" stroke-width="6"/>`],
  ["El Sol", "EL SOL", () => sol(150, 140, 44) + [[70, 225, R], [100, 240, A], [200, 240, Y], [230, 225, R], [150, 242, A], [60, 190, Y], [240, 190, A]].map(([x, y, c]) => gota(x, y, c)).join("") +
    `<path d="M20 345 H280 V395 H20z" fill="${Y}"/>` + [0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => `<path d="M${20 + c * 44 + (r % 2 ? 22 : 0)} ${345 + r * 17} v17" fill="none" stroke-width="1.5"/>`).join("") + `<path d="M20 ${362 + r * 17} H280" stroke-width="1.5"/>`).join("") +
    `<rect x="20" y="430" width="260" height="35" fill="#b9d17a"/>` + persona(118, 448, { s: 1.0, tunica: A, cabeza: { pelo: Y }, manos: [[90, 340], [148, 330]] }) + persona(182, 448, { s: 1.0, tunica: R, cabeza: { pelo: Y }, manos: [[152, 330], [210, 340]] })],
  ["El Juicio", "EL JUICIO", () => nube(150, 200, 2) + alas(150, 130, 1.1, R) + cabeza(150, 110, 1.4, { pelo: Y }) + `<path d="M162 140 L230 210 l14 -6 l-6 14z" fill="${Y}"/><rect x="190" y="160" width="26" height="18" fill="${R}" transform="rotate(45 203 169)"/>` +
    `<path d="M95 360 h110 v60 h-110z" fill="${V}"/>` + persona(150, 380, { s: 0.9, tunica: P, cinto: false, cabeza: { pelo: Y }, manos: [[120, 270], [180, 270]] }) +
    persona(60, 448, { s: 1.05, tunica: P, cinto: false, cabeza: { pelo: Y }, manos: [[40, 320], [80, 330]] }) + persona(240, 448, { s: 1.05, tunica: P, cinto: false, cabeza: { pelo: K }, manos: [[220, 330], [260, 320]] }) + suelo(440)],
  ["El Mundo", "EL MUNDO", () => `<ellipse cx="150" cy="265" rx="72" ry="130" fill="none" stroke="${V}" stroke-width="16"/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = (i * Math.PI) / 6; return hojas(f(150 + 72 * Math.cos(a)), f(265 + 130 * Math.sin(a)), (i * 30) + 90, i % 2 ? V : "#4f7d2a"); }).join("") +
    persona(150, 385, { s: 1.15, tunica: CE, manto: R, cinto: false, cabeza: { pelo: Y }, manos: [[110, 250], [190, 290]] }) + `<path d="M110 250 L100 210" stroke-width="4"/>` +
    nube(68, 120, 0.6) + cabeza(62, 100, 1.1, { pelo: Y }) + nube(240, 120, 0.6) + `<path d="M222 100 q16 -20 34 0 l-10 8 l-14 -6z" fill="${Y}"/><circle cx="239" cy="96" r="2" fill="${K}"/>` +
    `<ellipse cx="64" cy="420" rx="34" ry="22" fill="${CR}"/><path d="M46 405 l-6 -12 M82 405 l6 -12" stroke-width="4"/><circle cx="236" cy="420" r="26" fill="${Y}"/><circle cx="236" cy="420" r="16" fill="${Y}"/><path d="M230 428 q6 6 12 0" fill="none"/>`],
];
// Corrige La Estrella: sin trono (se dibuja aparte); lo elimina reemplazando el color "none".

// ---------- salida ----------
const PALOS = [["copas", "Copas", "c"], ["oros", "Oros", "o"], ["espadas", "Espadas", "e"], ["bastos", "Bastos", "b"]];
const CORTE = ["Sota", "Caballo", "Reina", "Rey"];
const dos = (n) => String(n).padStart(2, "0");
const lista = [];
MAYORES.forEach(([nombre, banner, dibujo], i) => {
  const svg = carta(i === 0 ? "" : ROMANOS[i], banner, dibujo());
  writeFileSync(`${OUT}/m${dos(i)}.svg`, svg); lista.push([`m${dos(i)}`, nombre]);
});
for (const [palo, Palo, l] of PALOS) {
  for (let n = 1; n <= 10; n++) {
    const svg = carta(n === 1 ? "" : ROMANOS[n], `${NUM[n - 1]} de ${Palo}`.toUpperCase(), n === 1 ? as(palo) : pips(palo, n));
    writeFileSync(`${OUT}/${l}${dos(n)}.svg`, svg); lista.push([`${l}${dos(n)}`, `${NUM[n - 1]} de ${Palo}`]);
  }
  CORTE.forEach((r, k) => {
    const svg = carta("", `${r} de ${Palo}`.toUpperCase(), corte(palo, r));
    writeFileSync(`${OUT}/${l}${dos(11 + k)}.svg`, svg); lista.push([`${l}${dos(11 + k)}`, `${r} de ${Palo}`]);
  });
}
writeFileSync(`${OUT}/_lista.json`, JSON.stringify(lista));
console.log(lista.length, "cartas");
