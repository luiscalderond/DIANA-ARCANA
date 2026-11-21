// POST /api/opinar — guarda la calificación (1 a 5 estrellas) y el comentario de la clienta al terminar la lectura.
import * as db from "../lib/db.js";
import { leerCuerpo, idValido } from "../lib/acceso.js";
import { cuentaDeToken, tokenDe, claveDeCuenta } from "../lib/cuentas.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  let b; try { b = leerCuerpo(req); } catch { return res.status(400).json({ error: "Datos no válidos." }); }
  const cuenta = db.hayBaseDeDatos() ? await cuentaDeToken(tokenDe(req)).catch(() => null) : null;
  const dispositivo = cuenta ? claveDeCuenta(cuenta.id) : String(b.dispositivo || "").slice(0, 80);
  const estrellas = Math.round(Number(b.estrellas));
  if (!idValido(dispositivo) || !(estrellas >= 1 && estrellas <= 5)) return res.status(400).json({ error: "Elige de 1 a 5 estrellas." });
  if (!db.hayBaseDeDatos()) return res.status(200).json({ ok: true });
  try {
    // Máximo 5 opiniones por equipo al día, para que nadie llene la lista.
    if (await db.contarOpinionesDesde(dispositivo, new Date(Date.now() - 864e5).toISOString()) >= 5) return res.status(429).json({ error: "Ya recibimos tus opiniones de hoy. ¡Gracias!" });
    await db.guardarOpinion({ dispositivo, estrellas, comentario: String(b.comentario || "").trim().slice(0, 1000), tirada: String(b.tirada || "").slice(0, 80), cartas: String(b.cartas || "").slice(0, 300) });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Opinar", e);
    return res.status(500).json({ error: "No pudimos guardar tu opinión. Inténtalo otra vez." });
  }
}
