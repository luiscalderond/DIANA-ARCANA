// Reglas de acceso: consultas gratis por dispositivo y suscripción mensual.
import { randomUUID } from "node:crypto";
import * as db from "./db.js";

export const CONSULTAS_GRATIS = Number(process.env.CONSULTAS_GRATIS || 2);
export const PRECIO_DIA = Number(process.env.PRECIO_DIA || 1.99);
export const PRECIO_SEMANAL = Number(process.env.PRECIO_SEMANAL || 4.99);
export const TIRADAS_DIA = Number(process.env.TIRADAS_DIA || 4);
export const TIRADAS_SEMANAL = Number(process.env.TIRADAS_SEMANAL || 10);
// Topes contra abusos (cada mensaje a la IA cuesta):
// La prueba gratis se cuenta en tiradas o servicios (CONSULTAS_GRATIS), no en mensajes: los topes de mensajes
// son holgados y solo frenan a quien conversa sin parar sin hacer ninguna tirada.
export const GRATIS_POR_IP = Number(process.env.GRATIS_POR_IP || 10);           // consultas gratis por conexión en 24 h (en datos móviles muchas personas comparten conexión)
export const MENSAJES_SIN_TIRADA = Number(process.env.MENSAJES_SIN_TIRADA || 30); // mensajes antes de la primera tirada, o entre una y otra, mientras le quedan gratis
export const MENSAJES_TRAS_ULTIMA = Number(process.env.MENSAJES_TRAS_ULTIMA || 25); // mensajes tras su última tirada cuando ya no le quedan gratis (para terminar la lectura)
export const MENSAJES_DIA = Number(process.env.MENSAJES_DIA || 150);           // mensajes por equipo en 24 h, con o sin plan
// Consultas gratis solo desde estos países (código de 2 letras; Vercel lo da por la conexión). Vacío = todos.
export const PAISES_GRATIS = String(process.env.PAISES_GRATIS ?? "EC").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
const HACE = (horas) => new Date(Date.now() - horas * 3600 * 1000).toISOString();
// Planes: la letra de la referencia dice cuál pidió (DD- 24 horas, DS- semanal; DA- mensual antiguo, ya no se ofrece).
// Cada plan trae un límite de tiradas para que cada venta deje utilidad.
export const PLANES = {
  dia: { prefijo: "DD-", horas: 24, tiradas: TIRADAS_DIA, precio: PRECIO_DIA, nombre: "Pase de 24 horas" },
  semanal: { prefijo: "DS-", horas: 24 * 7, tiradas: TIRADAS_SEMANAL, precio: PRECIO_SEMANAL, nombre: "Semanal (7 días)" },
  mensual: { prefijo: "DA-", horas: 24 * 30, tiradas: 30, precio: 4.99, nombre: "Mensual (30 días)" },
  prueba: { prefijo: "DP-", horas: 24 * 365, tiradas: 100000, precio: 0, nombre: "Pruebas de Diana" },
};
export const planDeReferencia = (ref) => {
  const r = String(ref || "");
  return r.startsWith("DD-") ? "dia" : r.startsWith("DS-") ? "semanal" : r.startsWith("DP-") ? "prueba" : "mensual";
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
export async function usarConsulta({ dispositivo, ip, pais, ref }) {
  if (!db.hayBaseDeDatos()) return { permitido: true, suscrita: false, restantes: null };
  const id = randomUUID();
  // Planes activos: se usa el primero que aún tenga tiradas en su periodo.
  const activas = await db.suscripcionesActivasDe(dispositivo);
  const conTiradas = await planConTiradas(activas);
  if (conTiradas) {
    const { sus, plan, usadas } = conTiradas;
    await db.registrarConsulta(id, dispositivo, ip, sus.id);
    return { permitido: true, suscrita: true, restantes: plan.tiradas - usadas - 1, plan: plan.nombre };
  }
  if (!activas.length) {
    const usadas = await db.contarConsultas(dispositivo);
    // Tope por conexión: frena a quien borra el navegador o usa incógnito para tener más gratis.
    const porIp = usadas < CONSULTAS_GRATIS && ip !== "anon" ? await db.contarGratisPorIp(ip, HACE(24)) : 0;
    // Fuera del país (o con VPN de otro país) no hay gratis; los planes pagados sí funcionan.
    const paisOk = !pais || !PAISES_GRATIS.length || PAISES_GRATIS.includes(String(pais).toUpperCase());
    if (usadas < CONSULTAS_GRATIS && porIp < GRATIS_POR_IP && paisOk) {
      await db.registrarConsulta(id, dispositivo, ip, null);
      // Primera consulta de alguien que llegó por un código de referida: queda anotado (r:CODIGO:...).
      if (usadas === 0 && /^[A-Z0-9]{6}$/.test(ref || "")) await db.registrarMarca("r:" + ref, dispositivo, ip).catch(() => {});
      return { permitido: true, suscrita: false, restantes: CONSULTAS_GRATIS - usadas - 1 };
    }
  }
  // Tiradas de regalo por referir a una amiga que pagó.
  if (await bonosDisponibles(dispositivo) > 0) {
    await db.registrarConsulta(id, dispositivo, ip, null);
    await db.registrarMarca("u", dispositivo, ip);
    return { permitido: true, suscrita: false, bono: true, restantes: null };
  }
  const pendiente = await db.solicitudPendienteDe(dispositivo);
  return { permitido: false, agotado: activas.length > 0, pendiente: pendiente ? pendiente.referencia : null };
}

async function bonosDisponibles(dispositivo) {
  const [b, u] = await Promise.all([db.contarMarcas("b", dispositivo), db.contarMarcas("u", dispositivo)]);
  return b - u;
}

// Al activar el plan de una referida por primera vez, quien la invitó gana 1 tirada. Devuelve el código premiado o null.
export async function premiarReferida(suscriptora) {
  if (!db.hayBaseDeDatos()) return null;
  for (const dev of suscriptora.dispositivos || []) {
    const marcas = await db.marcasDe("r", dev);
    if (!marcas.length) continue;
    const codigo = String(marcas[0].id).split(":")[1];
    if (await db.existeMarca("k:" + dev)) return null;          // esa referida ya dio su premio
    const quien = await db.dispositivoPorCodigo(codigo);
    if (!quien || quien === dev) return null;
    await db.registrarMarca("k:" + dev, quien, null);
    await db.registrarMarca("b", quien, null);
    return codigo;
  }
  return null;
}

async function planConTiradas(activas) {
  for (const sus of activas) {
    const plan = PLANES[planDeReferencia(sus.referencia)];
    const desde = new Date(new Date(sus.activa_hasta).getTime() - plan.horas * 3600 * 1000);
    const usadas = await db.contarConsultasDePlan(sus.id, desde.toISOString());
    if (usadas < plan.tiradas) return { sus, plan, usadas };
  }
  return null;
}

// Antes de cada mensaje a la IA: topes de conversación para que charlar sin plan no sea gratis sin fin.
// Devuelve { ok: true } o { ok: false, motivo: "dia" | "plan", agotado, pendiente }.
export async function revisarMensaje({ dispositivo, ip }) {
  if (!db.hayBaseDeDatos()) return { ok: true };
  // Consultas independientes en paralelo: cada viaje a la base suma espera antes de que Arcana responda.
  const [mensajesHoy, activas, bonos, usadas, ult] = await Promise.all([
    db.contarMarcas("m", dispositivo, HACE(24)), db.suscripcionesActivasDe(dispositivo), bonosDisponibles(dispositivo), db.contarConsultas(dispositivo), db.ultimaConsulta(dispositivo),
  ]);
  if (mensajesHoy >= MENSAJES_DIA) return { ok: false, motivo: "dia" };
  const conTiradas = activas.length ? await planConTiradas(activas) : null;
  if (!conTiradas && bonos <= 0) {
    const bloquear = async () => {
      const pendiente = await db.solicitudPendienteDe(dispositivo);
      return { ok: false, motivo: "plan", agotado: activas.length > 0, pendiente: pendiente ? pendiente.referencia : null };
    };
    const quedanGratis = !activas.length && usadas < CONSULTAS_GRATIS;
    const tope = quedanGratis ? MENSAJES_SIN_TIRADA : MENSAJES_TRAS_ULTIMA;
    if (await db.contarMarcas("m", dispositivo, ult ? ult.creada : null) >= tope) return bloquear();
  }
  await db.registrarMarca("m", dispositivo, ip);
  return { ok: true, plan: conTiradas ? conTiradas.plan.nombre : null };
}

// Baraja virtual después de mostrar_plan: no se cobra dos veces, pero solo una baraja por consulta reciente.
export async function barajaSinCobro({ dispositivo, ip }) {
  if (!db.hayBaseDeDatos()) return true;
  const ult = await db.ultimaConsulta(dispositivo);
  if (!ult || new Date(ult.creada) < new Date(HACE(3))) return false;
  if (await db.contarMarcas("v", dispositivo, ult.creada) > 0) return false;
  await db.registrarMarca("v", dispositivo, ip);
  return true;
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

// Permite escribir la cuenta en una sola línea usando \n o " | " como salto.
const lineas = (t) => (t ? String(t).replace(/\\n/g, "\n").replace(/\s+\|\s+/g, "\n").trim() : "");

export function datosDeposito() {
  return {
    precioDia: PRECIO_DIA,
    precioSemana: PRECIO_SEMANAL,
    tiradasDia: TIRADAS_DIA,
    tiradasSemana: TIRADAS_SEMANAL,
    cuenta: lineas(process.env.CUENTA_DEPOSITO) || "Pronto publicaremos los datos de la cuenta. Escríbenos por WhatsApp.",
    cuenta2: lineas(process.env.CUENTA_DEPOSITO_2) || undefined,          // segunda cuenta (otro banco), opcional
    qr: process.env.DEUNA_QR_URL || "/pagos/deuna-qr.png",                    // imagen del QR de DeUna, opcional
    whatsapp: (process.env.WHATSAPP_DIANA || "").replace(/\D/g, ""),
  };
}
