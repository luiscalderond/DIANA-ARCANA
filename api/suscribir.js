// POST /api/suscribir — guarda la solicitud de suscripción y devuelve los datos para depositar.
import { randomInt } from "node:crypto";
import * as db from "../lib/db.js";
import { idValido, leerCuerpo, datosDeposito, PLANES } from "../lib/acceso.js";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!db.hayBaseDeDatos()) return res.status(503).json({ error: "Las suscripciones aún no están activas." });
  let b;
  try { b = leerCuerpo(req); } catch { return res.status(400).json({ error: "Datos no válidos." }); }

  const nombre = String(b.nombre || "").trim().slice(0, 120);
  const telefono = String(b.telefono || "").replace(/[^\d+]/g, "").slice(0, 20);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  if (nombre.length < 2) return res.status(400).json({ error: "Escribe tu nombre completo." });
  if (telefono.replace(/\D/g, "").length < 9) return res.status(400).json({ error: "Escribe un teléfono válido, por ejemplo 0991234567." });
  if (!EMAIL.test(email)) return res.status(400).json({ error: "Escribe un email válido." });
  if (b.acepto !== true) return res.status(400).json({ error: "Necesitamos tu autorización para usar tus datos." });
  if (!idValido(b.dispositivo)) return res.status(400).json({ error: "Recarga la página e intenta de nuevo." });

  try {
    const plan = b.plan === "semanal" ? "semanal" : "dia";
    const referencia = PLANES[plan].prefijo + String(randomInt(100000, 999999));
    await db.crearSolicitud({ nombre, telefono, email, dispositivo: b.dispositivo, referencia });
    return res.status(200).json({ referencia, ...datosDeposito(), plan, monto: PLANES[plan].precio });
  } catch (e) {
    console.error("Suscribir", e);
    return res.status(500).json({ error: "No pude guardar tu solicitud. Intenta de nuevo." });
  }
}
