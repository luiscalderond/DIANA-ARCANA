// Cálculo de carta astral: posiciones tropicales de planetas, Ascendente, Medio Cielo
// y casas por signo entero. Usa astronomy-engine (sin claves ni servicios de pago).
import { createRequire } from "node:module";

// Se carga la versión CommonJS: la versión ESM del paquete falla en Vercel.
const Astronomy = createRequire(import.meta.url)("astronomy-engine");

const SIGNOS = ["Aries", "Tauro", "Géminis", "Cáncer", "Leo", "Virgo", "Libra", "Escorpio", "Sagitario", "Capricornio", "Acuario", "Piscis"];
const PLANETAS = [
  ["Sol", "Sun"], ["Luna", "Moon"], ["Mercurio", "Mercury"], ["Venus", "Venus"], ["Marte", "Mars"],
  ["Júpiter", "Jupiter"], ["Saturno", "Saturn"], ["Urano", "Uranus"], ["Neptuno", "Neptune"], ["Plutón", "Pluto"],
];

const norm = (d) => ((d % 360) + 360) % 360;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function enSigno(lon) {
  const l = norm(lon);
  const i = Math.floor(l / 30);
  const g = l - i * 30;
  return { signo: SIGNOS[i], indice: i, grados: Math.floor(g), minutos: Math.floor((g % 1) * 60), longitud: +l.toFixed(2) };
}

function longitud(body, time) {
  if (body === "Sun") return Astronomy.SunPosition(time).elon;
  if (body === "Moon") return Astronomy.EclipticGeoMoon(time).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true)).elon;
}

// Busca el lugar de nacimiento con el geocodificador gratuito de Open-Meteo.
export async function buscarLugar(lugar) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&format=json&name=" + encodeURIComponent(lugar.split(",")[0].trim());
  const r = await fetch(url);
  if (!r.ok) throw new Error("No pude buscar el lugar de nacimiento.");
  const j = await r.json();
  const p = j.results && j.results[0];
  if (!p) throw new Error(`No encontré el lugar "${lugar}". Pide la ciudad y el país.`);
  return { nombre: [p.name, p.admin1, p.country].filter(Boolean).join(", "), lat: p.latitude, lon: p.longitude, zona: p.timezone };
}

// Convierte una fecha y hora locales de una zona horaria a un instante UTC.
export function localAUtc(fecha, hora, zona) {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = (hora || "12:00").split(":").map(Number);
  const deseado = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const verLocal = (t) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  let t = deseado;
  for (let i = 0; i < 3; i++) t += deseado - verLocal(t);
  return new Date(t);
}

export function calcularCarta({ utc, lat, lon }) {
  const time = Astronomy.MakeTime(utc);
  const manana = Astronomy.MakeTime(new Date(utc.getTime() + 864e5));
  const planetas = PLANETAS.map(([nombre, body]) => {
    const l = longitud(body, time);
    let dl = norm(longitud(body, manana) - l);
    if (dl > 180) dl -= 360;
    return { planeta: nombre, ...enSigno(l), retrogrado: body !== "Sun" && body !== "Moon" && dl < 0 };
  });

  const eps = rad(Astronomy.e_tilt(time).tobl);
  const ramc = rad(norm((Astronomy.SiderealTime(time) + lon / 15) * 15));
  const phi = rad(lat);
  const asc = norm(deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)))));
  const mc = norm(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps))));
  const ascS = enSigno(asc);

  for (const p of planetas) p.casa = ((p.indice - ascS.indice + 12) % 12) + 1;
  return { ascendente: ascS, medioCielo: enSigno(mc), planetas, sistemaCasas: "signo entero" };
}

export function resumenCarta(c, lugar, sinHora) {
  const f = (x) => `${x.signo} ${x.grados}°${String(x.minutos).padStart(2, "0")}'`;
  const lineas = c.planetas.map((p) => `${p.planeta}: ${f(p)}${p.retrogrado ? " retrógrado" : ""}${sinHora ? "" : `, casa ${p.casa}`}`);
  const cab = [`Lugar: ${lugar}`];
  if (sinHora) cab.push("Hora de nacimiento desconocida: se usó el mediodía; Ascendente, casas y grado de la Luna no son fiables.");
  else cab.push(`Ascendente: ${f(c.ascendente)}`, `Medio Cielo: ${f(c.medioCielo)}`, "Casas por signo entero.");
  return [...cab, ...lineas].join("\n");
}
