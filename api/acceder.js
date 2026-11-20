// POST /api/acceder — una suscriptora activa entra desde otro celular o computador.
import * as db from "../lib/db.js";
import { idValido, leerCuerpo } from "../lib/acceso.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!db.hayBaseDeDatos()) return res.status(503).json({ error: "Las suscripciones aún no están activas." });
  let b;
  try { b = leerCuerpo(req); } catch { return res.status(400).json({ error: "Datos no válidos." }); }
  const email = String(b.email || "").trim().toLowerCase();
  const telefono = String(b.telefono || "").replace(/[^\d+]/g, "");
  if (!email || !telefono || !idValido(b.dispositivo)) return res.status(400).json({ error: "Escribe tu email y tu teléfono." });
  try {
    const s = await db.buscarPorEmailTelefono(email, telefono);
    if (!s) return res.status(404).json({ error: "No encontramos una suscripción con esos datos." });
    await db.agregarDispositivo(s.id, s.dispositivos || [], b.dispositivo);
    const activa = s.estado === "activa" && s.activa_hasta && new Date(s.activa_hasta) > new Date();
    if (!activa) return res.status(200).json({ activa: false, mensaje: s.estado === "pendiente" ? "Tu suscripción está pendiente. Diana la activará cuando confirme tu depósito." : "Tu suscripción venció. Renuévala para seguir consultando." });
    return res.status(200).json({ activa: true, hasta: s.activa_hasta });
  } catch (e) {
    console.error("Acceder", e);
    return res.status(500).json({ error: "No pude revisar tu suscripción. Intenta de nuevo." });
  }
}
