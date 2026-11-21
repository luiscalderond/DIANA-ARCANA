// /api/admin — lista y activa suscriptoras. Protegido con la variable ADMIN_CLAVE.
import { timingSafeEqual } from "node:crypto";
import * as db from "../lib/db.js";
import { leerCuerpo, PLANES, planDeReferencia, premiarReferida } from "../lib/acceso.js";

function autorizado(req) {
  const esperada = process.env.ADMIN_CLAVE || "";
  const dada = String(req.headers["x-admin-clave"] || "");
  if (esperada.length < 8 || dada.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(esperada));
}

// Máximo 10 intentos fallidos por hora y conexión (aproximado: memoria de cada servidor).
const fallos = new Map();
export default async function handler(req, res) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const hora = new Date().toISOString().slice(0, 13), k = hora + "|" + ip;
  if ((fallos.get(k) || 0) >= 10) return res.status(429).json({ error: "Demasiados intentos. Espera una hora." });
  if (!autorizado(req)) {
    fallos.set(k, (fallos.get(k) || 0) + 1); if (fallos.size > 2000) fallos.clear();
    return res.status(401).json({ error: "Clave incorrecta." });
  }
  if (!db.hayBaseDeDatos()) return res.status(503).json({ error: "Falta conectar la base de datos." });
  try {
    if (req.method === "GET" && /[?&]ver=opiniones/.test(req.url || "")) {
      try { return res.status(200).json({ opiniones: await db.listarOpiniones() }); }
      catch (e) { return res.status(200).json({ opiniones: [], aviso: "Falta crear la tabla de opiniones en Supabase (supabase/esquema.sql)." }); }
    }
    if (req.method === "GET") return res.status(200).json({ suscriptoras: await db.listarSuscriptoras() });
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    const b = leerCuerpo(req);
    const s = await db.obtenerSuscriptora(String(b.id || ""));
    if (!s) return res.status(404).json({ error: "No existe esa suscriptora." });
    if (b.accion === "activar") {
      const base = s.activa_hasta && new Date(s.activa_hasta) > new Date() ? new Date(s.activa_hasta) : new Date();
      const plan = PLANES[b.plan] ? b.plan : planDeReferencia(s.referencia);
      base.setTime(base.getTime() + PLANES[plan].horas * 3600 * 1000);
      await db.actualizarSuscriptora(s.id, { estado: "activa", activa_hasta: base.toISOString() });
      // Programa de referidas: si llegó invitada, quien la invitó gana 1 tirada (solo la primera vez).
      const premiada = await premiarReferida(s).catch((e) => { console.error("Referida", e); return null; });
      if (premiada) return res.status(200).json({ ok: true, aviso: `Esta clienta llegó referida por el código ${premiada}. Ya se regaló 1 tirada a quien la invitó.` });
    } else if (b.accion === "desactivar") {
      await db.actualizarSuscriptora(s.id, { estado: "inactiva" });
    } else return res.status(400).json({ error: "Acción no válida." });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Admin", e);
    return res.status(500).json({ error: "Algo salió mal." });
  }
}
