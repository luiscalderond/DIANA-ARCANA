// GET /api/salud — revisa que el servidor esté bien configurado (no muestra la clave).
export default async function handler(req, res) {
  const estado = { clave: Boolean(process.env.ANTHROPIC_API_KEY), node: process.version };
  try { await import("@anthropic-ai/sdk"); await import("@anthropic-ai/sdk/helpers/beta/json-schema"); estado.sdk = "ok"; } catch (e) { estado.sdk = "error: " + e.message; }
  try { await import("../lib/astro.js"); await import("../lib/mazo.js"); estado.librerias = "ok"; } catch (e) { estado.librerias = "error: " + e.message; }
  // Base de datos: muestra solo el tipo de clave, nunca la clave.
  const url = process.env.SUPABASE_URL || "", k = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  estado.supabase_url = url ? url.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "falta";
  estado.supabase_clave = !k ? "falta" : k.startsWith("sb_secret_") ? "secreta nueva" : k.startsWith("sb_publishable_") ? "PUBLICABLE (incorrecta)" : k.startsWith("eyJ") ? "JWT (service_role o anon)" : "formato desconocido";
  if (k.trim() !== k) estado.supabase_clave += " con espacios al inicio o final";
  try { const db = await import("../lib/db.js"); await db.contarConsultas("prueba-salud"); estado.supabase = "ok"; } catch (e) { estado.supabase = "error: " + String(e.message).slice(0, 300); }
  estado.whatsapp = Boolean(process.env.WHATSAPP_DIANA); estado.cuenta = Boolean(process.env.CUENTA_DEPOSITO); estado.admin = (process.env.ADMIN_CLAVE || "").length >= 8;
  res.status(200).json(estado);
}
