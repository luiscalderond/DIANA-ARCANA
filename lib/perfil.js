// Perfil de la clienta (nombre, nacimiento, otras personas y lecturas) a partir de su cuenta.
import { buscarFecha } from "./numerologia.js";
import { saludoDe, SALUDO } from "./prompt.js";

export const limpio = (x, n) => String(x || "").replace(/[\[\]{}<>\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export function perfilValido(p) {
  if (!p || typeof p !== "object") return null;
  const nombre = limpio(p.nombre, 80), fecha = limpio(p.fecha, 20), ciudad = limpio(p.ciudad, 60), relacion = limpio(p.relacion, 40);
  if (nombre.length < 2 || ciudad.length < 2 || !buscarFecha(fecha)) return null;
  const otros = Array.isArray(p.otros) ? p.otros.slice(0, 6).map((o) => perfilValido({ ...o, otros: null, lecturas: null })).filter(Boolean) : [];
  const lecturas = Array.isArray(p.lecturas) ? p.lecturas.slice(0, 5).map((l) => ({ f: limpio(l && l.f, 10), t: limpio(l && l.t, 60), c: limpio(l && l.c, 200), x: limpio(l && l.x, 400) })).filter((l) => l.t) : [];
  return { nombre, fecha, ciudad, ...(relacion ? { relacion } : {}), ...(otros.length ? { otros } : {}), ...(lecturas.length ? { lecturas } : {}) };
}

// Con fecha y ciudad guardadas devuelve el perfil completo; si faltan, null (Arcana se las pide).
export const perfilDeCuenta = (c) => c ? perfilValido({ nombre: c.nombre, ...(c.datos || {}) }) : null;

const primer = (n) => String(n || "").split(/\s+/)[0];
// Saludo cuando la cuenta aún no tiene la fecha y la ciudad de nacimiento.
export const saludoNuevo = (nombre) => `Te doy la bienvenida a este espacio sagrado, ${primer(nombre)}. Soy Arcana, la asistente virtual de Diana. Las cartas y las estrellas guardan mensajes para quien llega con el corazón abierto. Para sintonizar con tu energía, dime tu fecha de nacimiento y la ciudad donde naciste.`;
export function saludoCuenta(c) {
  if (!c) return SALUDO;
  const p = perfilDeCuenta(c);
  return p ? saludoDelDia(p, new Date(), visitaDeHoy(c.datos)) : saludoNuevo(c.nombre);
}

// Cuántas veces entró hoy (hora de Ecuador). Cada visita del mismo día recibe un saludo distinto.
export const hoyEcuador = (d = new Date()) => new Date(d.getTime() - 5 * 36e5).toISOString().slice(0, 10);
export const visitaDeHoy = (datos, ahora = new Date()) => datos && datos.visita && datos.visita.d === hoyEcuador(ahora) ? Math.max(1, Number(datos.visita.n) || 1) : 1;
export const siguienteVisita = (datos, ahora = new Date()) => {
  const v = datos && datos.visita, hoy = hoyEcuador(ahora);
  return { d: hoy, n: v && v.d === hoy ? Math.min(999, (Number(v.n) || 1) + 1) : 1 };
};

// Guarda en la cuenta lo que Arcana anotó con guardar_datos.
export function datosConPerfil(datos, p) {
  const d = { otros: [], lecturas: [], ...(datos || {}) };
  if (p.para === "titular") { d.fecha = p.fecha; d.ciudad = p.ciudad; }
  else {
    const mismo = (o) => limpio(o.nombre, 80).toLowerCase() === p.nombre.toLowerCase();
    d.otros = [{ nombre: p.nombre, fecha: p.fecha, ciudad: p.ciudad, ...(p.relacion ? { relacion: p.relacion } : {}) }, ...(d.otros || []).filter((o) => !mismo(o))].slice(0, 6);
  }
  return d;
}

// Saludo para quien vuelve: cambia cada día según la Luna real y su signo, y retoma su historial. Sin costo de IA.
import { signoLunar } from "./astro.js";
import { buscarFecha as _bf, signoSolar } from "./numerologia.js";
const ELEMENTO = { Aries: "fuego", Leo: "fuego", Sagitario: "fuego", Tauro: "tierra", Virgo: "tierra", Capricornio: "tierra", Géminis: "aire", Libra: "aire", Acuario: "aire", Cáncer: "agua", Escorpio: "agua", Piscis: "agua" };
const AFIN = { fuego: "aire", aire: "fuego", tierra: "agua", agua: "tierra" };
const FRASES = {
  mismo: ["la Luna habla tu mismo idioma: confía en lo que sientes primero", "tu energía está amplificada; es un buen día para decidir con el corazón", "lo que intuyes hoy tiene más fuerza de lo normal"],
  afin: ["el cielo te acompaña con suavidad: buen momento para abrir caminos", "es un día que te favorece para pedir claridad", "la energía fluye a tu favor si das el primer paso"],
  reto: ["el cielo te invita a ir más despacio y escucharte antes de actuar", "conviene mirar las cosas desde otro ángulo antes de decidir", "es un día para soltar el control y observar qué se revela"],
};
const APERTURAS = ["Qué alegría tenerte de nuevo", "Bienvenida otra vez", "Qué bueno verte por aquí", "Te estaba esperando"];
const diaDelAnio = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
const REGRESOS = [
  (h, n) => `${h} de nuevo, ${n}. Qué bueno que regresas.`,
  (h, n) => `Aquí sigo contigo, ${n}.`,
  (h, n) => `${n}, volviste. Las cartas siguen atentas.`,
  (h, n) => `${h}, ${n}. Me alegra que vuelvas tan pronto.`,
  (h, n) => `Otra vez juntas, ${n}. La mesa sigue lista.`,
  (h, n) => `${h}, ${n}. Tu energía todavía está fresca en las cartas.`,
];
const CIERRES_LECTURA = [
  (t) => ` ¿Seguimos con «${t}» o abrimos algo distinto?`,
  (t) => ` ¿Quieres profundizar en «${t}», o hay una pregunta nueva?`,
  (t) => ` Si algo de «${t}» quedó dando vueltas, lo vemos; o empezamos otra consulta.`,
  (t) => ` ¿Qué te trae ahora: algo de «${t}» o un tema nuevo?`,
];
const CIERRES = [
  " ¿Qué quieres consultar ahora?",
  " ¿Qué te trae esta vez, algo para ti o para alguien más?",
  " Cuéntame qué tienes en mente y elegimos la tirada.",
];
const franja = (d) => { const h = (d.getUTCHours() + 19) % 24; return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
// visita: 1 = primera entrada del día (saludo con la Luna); 2, 3… = regresos del mismo día (saludo breve, siempre distinto).
export function saludoDelDia(p, ahora = new Date(), visita = 1) {
  const nombre = p.nombre.split(/\s+/)[0];
  const dia = diaDelAnio(ahora);
  if (visita > 1) {
    const k = visita - 2 + dia, t = p.lecturas && p.lecturas.length ? p.lecturas[0].t : "";
    const cierre = t ? CIERRES_LECTURA[k % CIERRES_LECTURA.length](t) : CIERRES[k % CIERRES.length];
    return REGRESOS[k % REGRESOS.length](franja(ahora), nombre) + cierre;
  }
  let cielo = "";
  try {
    const f = _bf(p.fecha), solar = f ? signoSolar(f) : null, luna = signoLunar(ahora);
    if (solar) {
      const e1 = ELEMENTO[solar], e2 = ELEMENTO[luna];
      const tipo = e1 === e2 ? "mismo" : AFIN[e1] === e2 ? "afin" : "reto";
      cielo = ` Hoy la Luna pasa por ${luna}, y para tu ${solar} ${FRASES[tipo][dia % 3]}.`;
    }
  } catch {}
  const apertura = APERTURAS[dia % APERTURAS.length];
  const cierre = p.lecturas && p.lecturas.length
    ? ` La última vez abrimos «${p.lecturas[0].t}». ¿Retomamos donde quedamos, o hoy consultas algo nuevo, para ti o para otra persona?`
    : " ¿La consulta de hoy es para ti o para otra persona?";
  return `${apertura}, ${nombre}.${cielo}${cierre}`;
}
