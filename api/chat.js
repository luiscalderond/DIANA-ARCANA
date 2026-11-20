// POST /api/chat — conversa con Arcana (Claude) desde la web.
// La clave ANTHROPIC_API_KEY vive solo en Vercel (variables de entorno), nunca en el navegador.
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { SISTEMA, SALUDO } from "../lib/prompt.js";
import { buscarLugar, localAUtc, calcularCarta, resumenCarta } from "../lib/astro.js";
import { tirar, TIRADAS } from "../lib/mazo.js";

const client = new Anthropic();

const MAX_MENSAJES = 40;           // turnos que se aceptan por consulta
const MAX_CARACTERES = 4000;       // por mensaje
const MAX_IMAGEN = 3_500_000;      // bytes en base64
const LIMITE_DIARIO = Number(process.env.LIMITE_DIARIO || 60); // mensajes por persona por día

// Límite simple por IP. Vive en la memoria de cada servidor de Vercel, así que es aproximado.
const contador = new Map();
function permitir(ip) {
  const hoy = new Date().toISOString().slice(0, 10);
  const k = hoy + "|" + ip;
  const n = (contador.get(k) || 0) + 1;
  contador.set(k, n);
  if (contador.size > 5000) contador.clear();
  return n <= LIMITE_DIARIO;
}

function limpiarHistorial(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0 || mensajes.length > MAX_MENSAJES) return null;
  const out = [];
  for (const m of mensajes) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.slice(0, MAX_CARACTERES * 2).trim();
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  while (out.length && out[0].role === "assistant") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  // La conversación arranca con el saludo fijo de Arcana que la clienta ve en pantalla.
  return [{ role: "user", content: "Hola" }, { role: "assistant", content: SALUDO }, ...out];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Falta configurar la clave de Anthropic en Vercel." });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  if (!permitir(ip)) return res.status(429).json({ error: "Llegaste al límite de consultas de hoy. Vuelve mañana o agenda una sesión con Diana." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const mensajes = limpiarHistorial(body.messages);
  if (!mensajes) return res.status(400).json({ error: "La conversación no es válida." });

  // Foto de la tirada: se adjunta al último mensaje del usuario.
  const img = body.image;
  if (img) {
    const tipos = ["image/jpeg", "image/png", "image/webp"];
    if (!tipos.includes(img.media_type) || typeof img.data !== "string" || img.data.length > MAX_IMAGEN) {
      return res.status(400).json({ error: "La foto no es válida o es muy grande." });
    }
    const ultimo = mensajes[mensajes.length - 1];
    ultimo.content = [
      { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } },
      { type: "text", text: "[Foto de la tirada de tarot de la persona] " + ultimo.content },
    ];
  }

  let memo = "";
  const cartaAstral = betaTool({
    name: "calcular_carta_astral",
    description: "Calcula la carta astral exacta (signos de Sol, Luna y planetas, retrógrados, Ascendente, Medio Cielo y casas por signo entero) a partir de la fecha, hora y lugar de nacimiento. Úsala siempre antes de interpretar una carta astral.",
    inputSchema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre de la persona" },
        fecha: { type: "string", description: "Fecha de nacimiento en formato AAAA-MM-DD" },
        hora: { type: "string", description: "Hora local de nacimiento en formato HH:MM de 24 horas. Vacío si no la sabe." },
        lugar: { type: "string", description: "Ciudad y país de nacimiento" },
      },
      required: ["nombre", "fecha", "hora", "lugar"],
      additionalProperties: false,
    },
    run: async ({ nombre, fecha, hora, lugar }) => {
      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "Error: la fecha debe ser AAAA-MM-DD.";
        const sinHora = !/^\d{1,2}:\d{2}$/.test(hora || "");
        const p = await buscarLugar(lugar);
        const utc = localAUtc(fecha, sinHora ? "12:00" : hora, p.zona);
        const resumen = resumenCarta(calcularCarta({ utc, lat: p.lat, lon: p.lon }), p.nombre, sinHora);
        memo += `Carta de ${nombre} (${fecha} ${sinHora ? "sin hora" : hora}):\n${resumen}\n`;
        return resumen;
      } catch (e) {
        return "Error: " + e.message;
      }
    },
  });

  let cartas = null;
  const tiradaVirtual = betaTool({
    name: "tirada_virtual",
    description: "Baraja el mazo Rider-Waite de 78 cartas con azar real y saca las cartas de una tirada, cada una al derecho o invertida. Úsala solo cuando la persona no tiene mazo físico y acepta que Arcana tire por ella. Las cartas se le muestran en pantalla.",
    inputSchema: {
      type: "object",
      properties: { tipo: { type: "string", enum: Object.keys(TIRADAS), description: "Tipo de tirada" } },
      required: ["tipo"],
      additionalProperties: false,
    },
    run: async ({ tipo }) => {
      try {
        cartas = tirar(tipo);
        const txt = cartas.map((c, i) => `${i + 1}. ${c.posicion}: ${c.carta}${c.invertida ? " (invertida)" : ""}`).join("\n");
        memo += `Tirada virtual (${tipo}):\n${txt}\n`;
        return txt;
      } catch (e) {
        return "Error: " + e.message;
      }
    },
  });

  try {
    const final = await client.beta.messages.toolRunner({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      max_iterations: 4,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: SISTEMA,
      tools: [cartaAstral, tiradaVirtual],
      messages: mensajes,
    });

    if (final.stop_reason === "refusal") {
      return res.status(200).json({ text: "Prefiero no responder a eso. ¿Te acompaño con una lectura de tarot, tu carta astral o un ritual?" });
    }
    const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").replace(/[*#_`]/g, "").trim();
    return res.status(200).json({ text: text || "Perdona, no alcancé a responder. ¿Me lo repites?", memo: memo || undefined, cartas: cartas || undefined });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Hay muchas consultas en este momento. Espera unos segundos y vuelve a intentar." });
    if (error instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "La clave de Anthropic no es válida. Revisa la configuración en Vercel." });
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic", error.status, error.message);
      return res.status(502).json({ error: "Arcana no pudo responder ahora. Intenta de nuevo en un momento." });
    }
    console.error(error);
    return res.status(500).json({ error: "Algo salió mal. Intenta de nuevo." });
  }
}
