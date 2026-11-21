// Reglas de acceso: consultas gratis por dispositivo y suscripción mensual.
import * as db from "./db.js";

export const CONSULTAS_GRATIS = Number(process.env.CONSULTAS_GRATIS || 3);
export const PRECIO_MENSUAL = Number(process.env.PRECIO_MENSUAL || 4.99);
const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

export const idValido = (x) => typeof x === "string" && ID_VALIDO.test(x);

export function leerCuerpo(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

export const ipDe = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";

// Devuelve { permitido: true } o { permitido: false, pendiente } para mostrar la suscripción.
export async function verificarAcceso({ dispositivo, consulta, ip }) {
  if (!db.hayBaseDeDatos()) {
    console.warn("Sin base de datos: el límite de consultas gratis está desactivado.");
    return { permitido: true };
  }
  if (await db.consultaExiste(consulta)) return { permitido: true };
  const sus = await db.suscriptoraActivaDe(dispositivo);
  if (sus) {
    await db.registrarConsulta(consulta, dispositivo, ip, sus.id);
    return { permitido: true };
  }
  const usadas = await db.contarConsultas(dispositivo);
  if (usadas < CONSULTAS_GRATIS) {
    await db.registrarConsulta(consulta, dispositivo, ip, null);
    return { permitido: true, gratisRestantes: CONSULTAS_GRATIS - usadas - 1 };
  }
  const pendiente = await db.solicitudPendienteDe(dispositivo);
  return { permitido: false, pendiente: pendiente ? pendiente.referencia : null };
}

export function datosDeposito() {
  return {
    precio: PRECIO_MENSUAL,
    cuenta: process.env.CUENTA_DEPOSITO || "Pronto publicaremos los datos de la cuenta. Escríbenos por WhatsApp.",
    whatsapp: (process.env.WHATSAPP_DIANA || "").replace(/\D/g, ""),
  };
}
