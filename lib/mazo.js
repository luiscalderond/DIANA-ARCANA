// Mazo Rider-Waite de 78 cartas y tirada virtual con azar criptográfico.
import { randomInt } from "node:crypto";

const MAYORES = ["El Loco", "El Mago", "La Sacerdotisa", "La Emperatriz", "El Emperador", "El Hierofante", "Los Enamorados", "El Carro", "La Fuerza", "El Ermitaño", "La Rueda de la Fortuna", "La Justicia", "El Colgado", "La Muerte", "La Templanza", "El Diablo", "La Torre", "La Estrella", "La Luna", "El Sol", "El Juicio", "El Mundo"];
const NUMEROS = ["As", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez", "Sota", "Caballero", "Reina", "Rey"];
const PALOS = ["Bastos", "Copas", "Espadas", "Pentáculos"];

export const MAZO = [
  ...MAYORES.map((n, i) => ({ nombre: n, arcano: "mayor", numero: i })),
  ...PALOS.flatMap((p) => NUMEROS.map((n, i) => ({ nombre: `${n} de ${p}`, arcano: "menor", palo: p, numero: i + 1 }))),
];

export const TIRADAS = {
  una_carta: ["Mensaje"],
  pasado_presente_futuro: ["Pasado", "Presente", "Futuro"],
  pareja: ["Tú", "La otra persona", "La relación hoy", "El obstáculo", "El consejo"],
  decision: ["La situación", "Camino A (1)", "Camino A (2)", "Camino B (1)", "Camino B (2)"],
  cruz_celta: ["Situación actual", "Lo que cruza", "Base", "Pasado reciente", "Lo que corona", "Futuro cercano", "Tú", "Entorno", "Esperanzas y temores", "Resultado"],
};

// Baraja Fisher-Yates y toma las primeras cartas; cada una puede salir invertida.
export function tirar(tipo) {
  const posiciones = TIRADAS[tipo];
  if (!posiciones) throw new Error("Tirada desconocida");
  const m = MAZO.slice();
  for (let i = m.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [m[i], m[j]] = [m[j], m[i]];
  }
  return posiciones.map((pos, i) => ({ posicion: pos, carta: m[i].nombre, invertida: randomInt(2) === 1 }));
}
