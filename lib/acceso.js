// Reglas de acceso: consultas gratis por dispositivo y suscripción mensual.
import { randomUUID } from "node:crypto";
import * as db from "./db.js";

export const CONSULTAS_GRATIS = Number(process.env.CONSULTAS_GRATIS || 2);
export const PRECIO_DIA = Number(process.env.PRECIO_DIA || 1.99);
export const PRECIO_SEMANAL = Number(process.env.PRECIO_SEMANAL || 4.99);
export const TIRADAS_DIA = Number(process.env.TIRADAS_DIA || 4);
export const TIRADAS_SEMANAL = Number(process.env.TIRADAS_SEMANAL || 10);
// Planes: la letra de la referencia dice cuál pidió (DD- 24 horas, DS- semanal; DA- mensual antiguo, ya no se ofrece).
// Cada plan trae un límite de tiradas para que cada venta deje utilidad.
export const PLANES = {
  dia: { prefijo: "DD-", horas: 24, tiradas: TIRADAS_DIA, precio: PRECIO_DIA, nombre: "Pase de 24 horas" },
  semanal: { prefijo: "DS-", horas: 24 * 7, tiradas: TIRADAS_SEMANAL, precio: PRECIO_SEMANAL, nombre: "Semanal (7 días)" },
  mensual: { prefijo: "DA-", horas: 24 * 30, tiradas: 30, precio: 4.99, nombre: "Mensual (30 días)" },
};
export const planDeReferencia = (ref) => {
  const r = String(ref || "");
  return r.startsWith("DD-") ? "dia" : r.startsWith("DS-") ? "semanal" : "mensual";
};
const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

export const idValido = (x) => typeof x === "string" && ID_VALIDO.test(x);

export function leerCuerpo(req) {
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

export const ipDe = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";

// Cada tirada o servicio gasta una consulta.
// Devuelve { permitido, suscrita, restantes } o { permitido: false, pendiente, agotado }.
export async function usarConsulta({ dispositivo, ip }) {
  if (!db.hayBaseDeDatos()) return { permitido: true, suscrita: false, restantes: null };
  const id = randomUUID();
  // Planes activos: se usa el primero que aún tenga tiradas en su periodo.
  const activas = await db.suscripcionesActivasDe(dispositivo);
  for (const sus of activas) {
    const plan = PLANES[planDeReferencia(sus.referencia)];
    const desde = new Date(new Date(sus.activa_hasta).getTime() - plan.horas * 3600 * 1000);
    const usadas = await db.contarConsultasDePlan(sus.id, desde.toISOString());
    if (usadas < plan.tiradas) {
      await db.registrarConsulta(id, dispositivo, ip, sus.id);
      return { permitido: true, suscrita: true, restantes: plan.tiradas - usadas - 1, plan: plan.nombre };
    }
  }
  if (!activas.length) {
    const usadas = await db.contarConsultas(dispositivo);
    if (usadas < CONSULTAS_GRATIS) {
      await db.registrarConsulta(id, dispositivo, ip, null);
      return { permitido: true, suscrita: false, restantes: CONSULTAS_GRATIS - usadas - 1 };
    }
  }
  const pendiente = await db.solicitudPendienteDe(dispositivo);
  return { permitido: false, agotado: activas.length > 0, pendiente: pendiente ? pendiente.referencia : null };
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
    precioDia: PRECIO_DIA,
    precioSemana: PRECIO_SEMANAL,
    tiradasDia: TIRADAS_DIA,
    tiradasSemana: TIRADAS_SEMANAL,
    cuenta: process.env.CUENTA_DEPOSITO || "Pronto publicaremos los datos de la cuenta. Escríbenos por WhatsApp.",
    whatsapp: (process.env.WHATSAPP_DIANA || "").replace(/\D/g, ""),
  };
}
