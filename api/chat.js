// POST /api/chat — conversa con Arcana (Claude) desde la web.
// La clave ANTHROPIC_API_KEY vive solo en Vercel (variables de entorno), nunca en el navegador.
import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { SISTEMA, SALUDO } from "../lib/prompt.js";
import { buscarLugar, localAUtc, calcularCarta, resumenCarta } from "../lib/astro.js";
import { barajar, TIRADAS, diagrama, plan } from "../lib/mazo.js";
import { usarConsulta, revisarMensaje, barajaSinCobro, idValido, datosDeposito } from "../lib/acceso.js";

const client = new Anthropic();

const MAX_MENSAJES = 40;           // turnos que se aceptan por consulta
const MAX_CARACTERES = 4000;       // por mensaje de Arcana (incluye notas internas)
const MAX_CARACTERES_CLIENTA = 1200; // por mensaje de la clienta: textos enormes encarecen cada consulta
const MAX_IMAGEN = 3_500_000;      // bytes en base64
const LIMITE_DIARIO = Number(process.env.LIMITE_DIARIO || 250); // mensajes por persona por día

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
    const content = m.content.slice(0, m.role === "user" ? MAX_CARACTERES_CLIENTA : MAX_CARACTERES * 2).trim();
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

  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; }
  catch { return res.status(400).json({ error: "La conversación no es válida." }); }
  const mensajes = limpiarHistorial(body.messages);
  if (!mensajes) return res.status(400).json({ error: "La conversación no es válida." });

  // Consultas gratis y suscripción.
  if (!idValido(body.dispositivo) || !idValido(body.consulta)) return res.status(400).json({ error: "Recarga la página para empezar una consulta." });
  // Topes de conversación antes de llamar a la IA (cada mensaje cuesta).
  try {
    const rev = await revisarMensaje({ dispositivo: body.dispositivo, ip });
    if (!rev.ok && rev.motivo === "dia") return res.status(429).json({ error: "Por hoy ya conversamos mucho. Vuelve mañana y seguimos con tu lectura." });
    if (!rev.ok) return res.status(402).json({ suscripcion: true, pendiente: rev.pendiente, agotado: rev.agotado || undefined, ...datosDeposito() });
  } catch (e) { console.error("Revisar mensaje", e); }
  // Cada tirada o servicio gasta una consulta (como máximo una por mensaje). Se cobra al empezarlo.
  let cobro = null, bloqueo = null;
  async function cobrar() {
    if (cobro) return cobro;
    try { cobro = await usarConsulta({ dispositivo: body.dispositivo, ip, pais: req.headers["x-vercel-ip-country"], ref: typeof body.ref === "string" ? body.ref.toUpperCase() : "" }); }
    catch (e) { console.error("Acceso", e); cobro = { permitido: false, error: true }; }
    if (!cobro.permitido && !cobro.error) bloqueo = { suscripcion: true, pendiente: cobro.pendiente, agotado: cobro.agotado || undefined, ...datosDeposito() };
    return cobro;
  }
  const NO_DISPONIBLE_GRATIS = "BLOQUEADO: la persona ya usó sus consultas gratis y no tiene un plan activo. No hagas la tirada ni el servicio. Dile con calidez, en dos o tres frases, que sus consultas gratis terminaron y que en pantalla aparecieron dos planes para seguir: el pase de 24 horas (hasta 4 tiradas) o el plan semanal (hasta 10 tiradas). Invítala a elegir uno para continuar justo donde quedaron.";
  const NO_DISPONIBLE_AGOTADO = "BLOQUEADO: la persona ya usó todas las tiradas de su plan actual. No hagas la tirada ni el servicio. Agradécele con calidez su confianza y dile, en dos o tres frases, que en pantalla aparecieron los planes para renovar: el pase de 24 horas (hasta 4 tiradas) o el semanal (hasta 10 tiradas, el que más le rinde).";
  const noDisponible = () => (cobro && cobro.agotado ? NO_DISPONIBLE_AGOTADO : NO_DISPONIBLE_GRATIS);
  const ERROR_ACCESO = "Error: no pude verificar sus consultas disponibles en este momento. Pídele que intente de nuevo en un momento.";
  const notaCobro = (c) => c.suscrita ? (c.restantes === 0 ? " Nota: esta es la última tirada de su plan; al final puedes mencionarlo con suavidad." : c.restantes != null ? ` Nota: le quedan ${c.restantes} tiradas en su plan después de esta.` : "") : c.restantes === 0 ? " Nota: esta es su última consulta gratis; puedes mencionarlo con suavidad al final." : c.restantes ? ` Nota: le quedan ${c.restantes} consultas gratis después de esta.` : "";
  const textoHistorial = mensajes.slice(-12).map((m) => (typeof m.content === "string" ? m.content : m.content.map((b) => b.text || "").join(" "))).join("\n");

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
        const c = await cobrar();
        if (c.error) return ERROR_ACCESO;
        if (!c.permitido) return noDisponible();
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

  let baraja = null;
  const tiradaVirtual = betaTool({
    name: "tirada_virtual",
    description: "Baraja el mazo Rider-Waite de 78 cartas con azar real y lo muestra en pantalla boca abajo, en abanico, para que la persona elija con el dedo las cartas de la tirada. Úsala solo cuando la persona no tiene mazo físico, en el paso de barajar. Tú no ves las cartas: la persona te enviará en su siguiente mensaje cuáles eligió.",
    inputSchema: {
      type: "object",
      properties: { tipo: { type: "string", enum: Object.keys(TIRADAS), description: "Tipo de tirada" } },
      required: ["tipo"],
      additionalProperties: false,
    },
    run: async ({ tipo }) => {
      try {
        // Si ya se mostró el plan (y se cobró), la baraja no cobra otra vez; se verifica en la base, no solo en el historial.
        const yaCobrada = /Plan mostrado/.test(memo) || (/Plan mostrado/.test(textoHistorial) && await barajaSinCobro({ dispositivo: body.dispositivo, ip }).catch(() => false));
        if (!yaCobrada) {
          const c = await cobrar();
          if (c.error) return ERROR_ACCESO;
          if (!c.permitido) return noDisponible();
        }
        baraja = barajar(tipo);
        const n = baraja.posiciones.length;
        return `Mazo barajado y mostrado en abanico. La persona va a elegir ${n} ${n === 1 ? "carta" : "cartas"} tocándolas; la primera que elija va al lugar 1 (${baraja.posiciones[0]})${n > 1 ? ", la segunda al lugar 2, y así" : ""}. Invítala a elegir con su intuición y espera su mensaje con las cartas.`;
      } catch (e) {
        return "Error: " + e.message;
      }
    },
  });

  let indice = null;
  const mostrarPlan = betaTool({
    name: "mostrar_plan",
    description: "Muestra en pantalla el índice paso a paso de la consulta de tarot (preparar el espacio, ritual, cartas, foto, lectura). Úsala apenas la persona elige la tirada, antes del ritual.",
    inputSchema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: Object.keys(TIRADAS), description: "Tirada elegida" },
        mazo_propio: { type: "boolean", description: "true si la persona usará su propio mazo; false si Arcana hará la tirada virtual" },
      },
      required: ["tipo", "mazo_propio"],
      additionalProperties: false,
    },
    run: async ({ tipo, mazo_propio }) => {
      try {
        const c = await cobrar();
        if (c.error) return ERROR_ACCESO;
        if (!c.permitido) return noDisponible();
        indice = plan(tipo, mazo_propio);
        memo += `Plan mostrado (${indice.nombre}, ${mazo_propio ? "mazo propio" : "tirada virtual"}): ${indice.pasos.map((p, i) => i + 1 + " " + p.titulo).join(", ")}\n`;
        return `Índice mostrado en pantalla: ${indice.pasos.map((p, i) => `Paso ${i + 1}: ${p.titulo}`).join("; ")}.` + notaCobro(c);
      } catch (e) {
        return "Error: " + e.message;
      }
    },
  });

  const iniciarServicio = betaTool({
    name: "iniciar_servicio",
    description: "Registra el inicio de un ritual personalizado o de una lectura de registros akáshicos (cada uno cuenta como una consulta). Úsala justo antes de crear el ritual o de abrir los registros. Si responde BLOQUEADO, no hagas el servicio.",
    inputSchema: {
      type: "object",
      properties: { servicio: { type: "string", enum: ["ritual", "registros_akashicos"] } },
      required: ["servicio"],
      additionalProperties: false,
    },
    run: async ({ servicio }) => {
      const c = await cobrar();
      if (c.error) return ERROR_ACCESO;
      if (!c.permitido) return noDisponible();
      memo += `Servicio iniciado: ${servicio}\n`;
      return "Listo, puedes continuar con el servicio." + notaCobro(c);
    },
  });

  let dibujo = null;
  const mostrarDiagrama = betaTool({
    name: "mostrar_diagrama",
    description: "Muestra en pantalla un diagrama numerado de la tirada elegida, con el lugar y el orden de cada carta. Úsala solo en el paso de colocar las cartas, después del ritual y de la conexión con la baraja, cuando la persona tiene su propio mazo.",
    inputSchema: {
      type: "object",
      properties: { tipo: { type: "string", enum: Object.keys(TIRADAS), description: "Tipo de tirada" } },
      required: ["tipo"],
      additionalProperties: false,
    },
    run: async ({ tipo }) => {
      try {
        dibujo = diagrama(tipo);
        memo += `Diagrama mostrado (${dibujo.nombre}): ${dibujo.posiciones.map((p) => p.n + " " + p.nombre).join(", ")}\n`;
        return `Diagrama de ${dibujo.nombre} mostrado en pantalla con estas posiciones: ${dibujo.posiciones.map((p) => p.n + ". " + p.nombre).join("; ")}.`;
      } catch (e) {
        return "Error: " + e.message;
      }
    },
  });

  try {
    const final = await client.beta.messages.toolRunner({
      model: "claude-sonnet-5-5",
      max_tokens: 16000,
      max_iterations: 5,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Con foto sube el esfuerzo: reconocer las cartas con precisión importa más que la rapidez.
      output_config: { effort: img ? "medium" : "low" },
      cache_control: { type: "ephemeral" },
      system: SISTEMA,
      tools: [cartaAstral, tiradaVirtual, mostrarPlan, mostrarDiagrama, iniciarServicio],
      messages: mensajes,
    });

    if (final.stop_reason === "refusal") {
      return res.status(200).json({ text: "Prefiero no responder a eso. ¿Te acompaño con una lectura de tarot, tu carta astral o un ritual?" });
    }
    const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").replace(/[*#_`]/g, "").trim();
    return res.status(200).json({ text: text || "Perdona, no alcancé a responder. ¿Me lo repites?", memo: memo || undefined, baraja: baraja || undefined, diagrama: dibujo || undefined, plan: indice || undefined, ...(bloqueo || {}) });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Hay muchas consultas en este momento. Espera unos segundos y vuelve a intentar." });
    if (error instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "La clave de Anthropic no es válida. Revisa la configuración en Vercel." });
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic", error.status, error.message);
      return res.status(502).json({ error: "Arcana no pudo responder ahora. Intenta de nuevo en un momento." });
    }
    console.error("Error inesperado", error);
    return res.status(500).json({ error: "Algo salió mal. Intenta de nuevo." });
  }
}
