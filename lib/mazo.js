// Mazo Rider-Waite de 78 cartas y tirada virtual con azar criptográfico.
import { randomInt } from "node:crypto";

const MAYORES = ["El Loco", "El Mago", "La Sacerdotisa", "La Emperatriz", "El Emperador", "El Hierofante", "Los Enamorados", "El Carro", "La Fuerza", "El Ermitaño", "La Rueda de la Fortuna", "La Justicia", "El Colgado", "La Muerte", "La Templanza", "El Diablo", "La Torre", "La Estrella", "La Luna", "El Sol", "El Juicio", "El Mundo"];
const NUMEROS = ["As", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez", "Sota", "Caballero", "Reina", "Rey"];
const PALOS = ["Bastos", "Copas", "Espadas", "Pentáculos"];

// Ilustraciones originales de Pamela Colman Smith (1909, dominio público; no la recoloración de 1971)
// en public/cartas/. Escaneos de Holly Voley vía Taro's Tarot (tarostarot.com/tarot-card-data).
const LETRA = { Bastos: "w", Copas: "c", Espadas: "s", Pentáculos: "p" };
const dos = (n) => String(n).padStart(2, "0");
export const MAZO = [
  ...MAYORES.map((n, i) => ({ nombre: n, arcano: "mayor", numero: i, imagen: `/cartas/m${dos(i)}.webp` })),
  ...PALOS.flatMap((p) => NUMEROS.map((n, i) => ({ nombre: `${n} de ${p}`, arcano: "menor", palo: p, numero: i + 1, imagen: `/cartas/${LETRA[p]}${dos(i + 1)}.webp` }))),
];

// Tarot de Marsella con diseño propio de Diana Arcana (public/marsella/, generado con scripts/generar-marsella.mjs),
// inspirado en la tradición marsellesa de los siglos XVII y XVIII (dominio público). Numeración y nombres de Marsella.
const MAYORES_MARSELLA = ["El Loco", "El Mago", "La Papisa", "La Emperatriz", "El Emperador", "El Papa", "El Enamorado", "El Carro", "La Justicia", "El Ermitaño", "La Rueda de la Fortuna", "La Fuerza", "El Colgado", "El Arcano sin nombre (XIII)", "La Templanza", "El Diablo", "La Torre", "La Estrella", "La Luna", "El Sol", "El Juicio", "El Mundo"];
const NUMEROS_MARSELLA = ["As", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez", "Sota", "Caballo", "Reina", "Rey"];
const PALOS_MARSELLA = [["Copas", "c"], ["Oros", "o"], ["Espadas", "e"], ["Bastos", "b"]];
export const MAZO_MARSELLA = [
  ...MAYORES_MARSELLA.map((n, i) => ({ nombre: n, arcano: "mayor", numero: i, imagen: `/marsella/m${dos(i)}.svg` })),
  ...PALOS_MARSELLA.flatMap(([p, l]) => NUMEROS_MARSELLA.map((n, i) => ({ nombre: `${n} de ${p}`, arcano: "menor", palo: p, numero: i + 1, imagen: `/marsella/${l}${dos(i + 1)}.svg` }))),
];
export const MAZOS = { rider_waite: MAZO, marsella: MAZO_MARSELLA };

export const TIRADAS = {
  una_carta: ["Mensaje"],
  pasado_presente_futuro: ["Pasado", "Presente", "Futuro"],
  pareja: ["Tú", "La otra persona", "La relación hoy", "El obstáculo", "El consejo"],
  decision: ["La situación", "Camino A (1)", "Camino A (2)", "Camino B (1)", "Camino B (2)"],
  mente_cuerpo_espiritu: ["Mente", "Cuerpo", "Espíritu"],
  si_o_no: ["Lo que te impulsa", "Lo que te frena", "La respuesta"],
  herradura: ["Pasado", "Presente", "Influencias ocultas", "Obstáculo", "Entorno", "Qué hacer", "Resultado"],
  chakras: ["Raíz", "Sacro", "Plexo solar", "Corazón", "Garganta", "Tercer ojo", "Corona"],
  camino_de_vida: ["Quién eres hoy", "Lo que debes soltar", "Lo que debes cultivar", "Tu don", "Tu reto", "Tu propósito"],
  anual: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
  cruz_marsella: ["A favor", "En contra", "El camino", "El resultado", "La síntesis"],
  cruz_celta: ["Situación actual", "Lo que cruza", "Base", "Pasado reciente", "Lo que corona", "Futuro cercano", "Tú", "Entorno", "Esperanzas y temores", "Resultado"],
};

export const NOMBRES = {
  una_carta: "Una carta", pasado_presente_futuro: "Pasado, presente y futuro", pareja: "Tirada de pareja", decision: "Tirada de decisión",
  mente_cuerpo_espiritu: "Mente, cuerpo y espíritu", si_o_no: "Sí o no", herradura: "La herradura", chakras: "Los chakras",
  camino_de_vida: "Camino de vida", anual: "Tirada anual", cruz_celta: "Cruz Celta", cruz_marsella: "Cruz de Marsella",
};

// Dónde va cada carta en la mesa: x en anchos de carta, y en altos de carta (con su espacio), r = giro.
const fila = (n) => Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));
const reloj = Array.from({ length: 12 }, (_, i) => {
  const a = ((i + 1) * Math.PI) / 6;
  return { x: +(3 + 3 * Math.sin(a)).toFixed(2), y: +(2 - 2 * Math.cos(a)).toFixed(2) };
});
export const DIAGRAMAS = {
  una_carta: fila(1),
  pasado_presente_futuro: fila(3),
  mente_cuerpo_espiritu: fila(3),
  si_o_no: fila(3),
  pareja: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }],
  decision: [{ x: 1, y: 0.5 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }, { x: 2, y: 1 }],
  herradura: [{ x: 0, y: 0 }, { x: 1, y: 0.5 }, { x: 2, y: 1 }, { x: 3, y: 1.5 }, { x: 4, y: 1 }, { x: 5, y: 0.5 }, { x: 6, y: 0 }],
  chakras: fila(7),
  camino_de_vida: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  anual: reloj,
  cruz_marsella: [{ x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }, { x: 1, y: 1 }],
  cruz_celta: [
    { x: 1.3, y: 1.5, arriba: true }, { x: 1.3, y: 1.5, r: 90 }, { x: 1.3, y: 2.5 }, { x: 0, y: 1.5 }, { x: 1.3, y: 0.5 }, { x: 2.6, y: 1.5 },
    { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 4, y: 1 }, { x: 4, y: 0 },
  ],
};

export function plan(tipo, mazoPropio) {
  if (!TIRADAS[tipo]) throw new Error("Tirada desconocida");
  const n = TIRADAS[tipo].length, cartas = n === 1 ? "1 carta" : `${n} cartas`;
  const pasos = mazoPropio
    ? [["Un momento para ti", "Respira y piensa en tu pregunta (una velita es opcional)"], ["Conecta con tu baraja", "Sopla, baraja y corta con la mano izquierda"], ["Coloca las cartas", `${cartas} según el diagrama numerado`], ["Toma la foto", "Desde arriba, con buena luz"], ["Tu lectura", "Carta por carta y el mensaje final"]]
    : [["Un momento para ti", "Respira y piensa en tu pregunta (una velita es opcional)"], ["Arcana baraja y tú eliges", `Toca ${cartas} del abanico, guiada por tu intuición`], ["Tu lectura", "Carta por carta y el mensaje final"]];
  return { tipo, nombre: NOMBRES[tipo], mazoPropio: Boolean(mazoPropio), pasos: pasos.map(([titulo, detalle]) => ({ titulo, detalle })) };
}

export function diagrama(tipo) {
  const posiciones = TIRADAS[tipo];
  if (!posiciones) throw new Error("Tirada desconocida");
  return { tipo, nombre: NOMBRES[tipo], posiciones: posiciones.map((p, i) => ({ n: i + 1, nombre: p, ...DIAGRAMAS[tipo][i] })) };
}

// Baraja Fisher-Yates y toma las primeras cartas; cada una puede salir invertida.
// Baraja las 78 cartas (con su orientación) para que la persona elija las suyas en pantalla.
export function barajar(tipo, mazo = "rider_waite") {
  const posiciones = TIRADAS[tipo];
  if (!posiciones) throw new Error("Tirada desconocida");
  const m = (MAZOS[mazo] || MAZO).slice();
  for (let i = m.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [m[i], m[j]] = [m[j], m[i]];
  }
  return { tipo, nombre: NOMBRES[tipo], mazo: MAZOS[mazo] ? mazo : "rider_waite", posiciones, cartas: m.map((c) => ({ carta: c.nombre, imagen: c.imagen, invertida: randomInt(2) === 1 })) };
}

export function tirar(tipo) {
  const posiciones = TIRADAS[tipo];
  if (!posiciones) throw new Error("Tirada desconocida");
  const m = MAZO.slice();
  for (let i = m.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [m[i], m[j]] = [m[j], m[i]];
  }
  return posiciones.map((pos, i) => ({ posicion: pos, carta: m[i].nombre, imagen: m[i].imagen, invertida: randomInt(2) === 1 }));
}
