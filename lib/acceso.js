// Reglas de acceso: consultas gratis por dispositivo y suscripción mensual.
import { randomUUID } from "node:crypto";
import * as db from "./db.js";

export const CONSULTAS_GRATIS = Number(process.env.CONSULTAS_GRATIS || 3);
export const PRECIO_MENSUAL = Number(process.env.PRECIO_MENSUAL || 4.99);
export const PRECIO_DIA = Number(process.env.PRECIO_DIA || 2);
// Planes: la letra de la referencia dice cuál pidió (DA- mensual, DD- pase de 24 horas).
export const PLANES = {
  mensual: { prefijo: "DA-", horas: 24 * 30, nombre: "Mensual (30 días)" },
  dia: { prefijo: "DD-", horas: 24, nombre: "Pase de 24 horas" },
};
export const planDeReferencia = (ref) => (String(ref || "").startsWith("DD-") ? "dia" : "mensual");
const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

export const idValido = (x) => typeof x === "string" && ID_VALIDO.test(x);

export function leerCuerpo(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

export const ipDe = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";

// Cada tirada o servicio gasta una consulta. Devuelve { permitido, suscrita, restantes } o { permitido: false, pendiente }.
export async function usarConsulta({ dispositivo, ip }) {
  if (!db.hayBaseDeDatos()) return { permitido: true, suscrita: false, restantes: null };
  const sus = await db.suscriptoraActivaDe(dispositivo);
  const id = randomUUID();
  if (sus) {
    await db.registrarConsulta(id, dispositivo, ip, sus.id);
    return { permitido: true, suscrita: true };
  }
  const usadas = await db.contarConsultas(dispositivo);
  if (usadas < CONSULTAS_GRATIS) {
    await db.registrarConsulta(id, dispositivo, ip, null);
    return { permitido: true, suscrita: false, restantes: CONSULTAS_GRATIS - usadas - 1 };
  }
  const pendiente = await db.solicitudPendienteDe(dispositivo);
  return { permitido: false, pendiente: pendiente ? pendiente.referencia : null };
}

// (Anterior: una consulta por conversación. Se mantiene por compatibilidad.)
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
    precioDia: PRECIO_DIA,
    cuenta: process.env.CUENTA_DEPOSITO || "Pronto publicaremos los datos de la cuenta. Escríbenos por WhatsApp.",
    whatsapp: (process.env.WHATSAPP_DIANA || "").replace(/\D/g, ""),
  };
}
