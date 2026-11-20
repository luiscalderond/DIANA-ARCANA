// /api/admin — lista y activa suscriptoras. Protegido con la variable ADMIN_CLAVE.
import { timingSafeEqual } from "node:crypto";
import * as db from "../lib/db.js";
import { leerCuerpo } from "../lib/acceso.js";

function autorizado(req) {
  const esperada = process.env.ADMIN_CLAVE || "";
  const dada = String(req.headers["x-admin-clave"] || "");
  if (esperada.length < 8 || dada.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(esperada));
}

export default async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: "Clave incorrecta." });
  if (!db.hayBaseDeDatos()) return res.status(503).json({ error: "Falta conectar la base de datos." });
  try {
    if (req.method === "GET") return res.status(200).json({ suscriptoras: await db.listarSuscriptoras() });
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    const b = leerCuerpo(req);
    const s = await db.obtenerSuscriptora(String(b.id || ""));
    if (!s) return res.status(404).json({ error: "No existe esa suscriptora." });
    if (b.accion === "activar") {
      const base = s.activa_hasta && new Date(s.activa_hasta) > new Date() ? new Date(s.activa_hasta) : new Date();
      base.setDate(base.getDate() + 30);
      await db.actualizarSuscriptora(s.id, { estado: "activa", activa_hasta: base.toISOString() });
    } else if (b.accion === "desactivar") {
      await db.actualizarSuscriptora(s.id, { estado: "inactiva" });
    } else return res.status(400).json({ error: "Acción no válida." });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Admin", e);
    return res.status(500).json({ error: "Algo salió mal." });
  }
}
