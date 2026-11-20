// GET /api/salud — revisa que el servidor esté bien configurado (no muestra la clave).
export default async function handler(req, res) {
  const estado = { clave: Boolean(process.env.ANTHROPIC_API_KEY), node: process.version };
  try { await import("@anthropic-ai/sdk"); await import("@anthropic-ai/sdk/helpers/beta/json-schema"); estado.sdk = "ok"; } catch (e) { estado.sdk = "error: " + e.message; }
  try { await import("../lib/astro.js"); await import("../lib/mazo.js"); estado.librerias = "ok"; } catch (e) { estado.librerias = "error: " + e.message; }
  res.status(200).json(estado);
}
