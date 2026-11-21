// Signo solar y número de vida calculados en el servidor, para que Arcana no haga sumas (ni se equivoque) frente a la clienta.
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function buscarFecha(texto) {
  const t = String(texto || "").toLowerCase();
  let m = t.match(/\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})\b/);
  if (m) return valida(+m[1], +m[2], +m[3]);
  m = t.match(/\b(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de(?:l)?\s+)?(\d{4})\b/);
  if (m) { const mes = MESES.findIndex((x) => m[2].startsWith(x.slice(0, 3))); if (mes >= 0) return valida(+m[1], mes + 1, +m[3]); }
  return null;
}
function valida(d, mes, a) {
  if (mes < 1 || mes > 12 || d < 1 || d > 31 || a < 1900 || a > 2100) return null;
  return { d, mes, a };
}

const SIGNOS = [[1, 20, "Capricornio"], [2, 19, "Acuario"], [3, 21, "Piscis"], [4, 20, "Aries"], [5, 21, "Tauro"], [6, 21, "Géminis"],
  [7, 23, "Cáncer"], [8, 23, "Leo"], [9, 23, "Virgo"], [10, 23, "Libra"], [11, 22, "Escorpio"], [12, 22, "Sagitario"]];
export function signoSolar({ d, mes }) {
  // Cada fila: [mes, día en que empieza el signo siguiente, signo que rige antes de ese día].
  const [, corte, signo] = SIGNOS[mes - 1];
  return d < corte ? signo : SIGNOS[mes % 12][2];
}
export function numeroDeVida({ d, mes, a }) {
  let n = `${d}${mes}${a}`.split("").reduce((s, x) => s + +x, 0);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split("").reduce((s, x) => s + +x, 0);
  return n;
}
export function notaNatal(texto) {
  const f = buscarFecha(texto);
  if (!f) return "";
  return `\n\n[Dato calculado por el sistema, úsalo tal cual y sin mostrar sumas ni cálculos: signo solar ${signoSolar(f)}, número de vida ${numeroDeVida(f)}.]`;
}
