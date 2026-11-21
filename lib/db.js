// Acceso a Supabase (PostgREST) solo desde el servidor, con la clave de servicio.
import { randomUUID } from "node:crypto";
// Tablas: arcana_consultas y arcana_suscriptoras (ver supabase/esquema.sql).
const URL_BASE = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const CLAVE = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

export const hayBaseDeDatos = () => Boolean(URL_BASE && CLAVE);

export async function rest(ruta, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    method,
    headers: {
      apikey: CLAVE,
      // Las claves nuevas (sb_secret_...) van solo en apikey; las antiguas (JWT) también en Authorization.
      ...(CLAVE.startsWith("sb_") ? {} : { Authorization: `Bearer ${CLAVE}` }),
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export const q = encodeURIComponent;

export async function suscriptoraActivaDe(dispositivo) {
  const ahora = new Date().toISOString();
  const filas = await rest(`arcana_suscriptoras?select=id,nombre,activa_hasta&estado=eq.activa&activa_hasta=gt.${q(ahora)}&dispositivos=cs.${q("{" + JSON.stringify(dispositivo) + "}")}&limit=1`);
  return filas[0] || null;
}

export async function suscripcionesActivasDe(dispositivo) {
  const ahora = new Date().toISOString();
  return rest(`arcana_suscriptoras?select=id,referencia,activa_hasta&estado=eq.activa&activa_hasta=gt.${q(ahora)}&dispositivos=cs.${q("{" + JSON.stringify(dispositivo) + "}")}&order=activa_hasta.asc&limit=10`);
}

export async function contarConsultasDePlan(suscriptoraId, desde) {
  const filas = await rest(`arcana_consultas?select=id&suscriptora_id=eq.${q(suscriptoraId)}&id=not.like.*:*&creada=gte.${q(desde)}`);
  return filas.length;
}

export async function solicitudPendienteDe(dispositivo) {
  const filas = await rest(`arcana_suscriptoras?select=id,referencia&estado=eq.pendiente&dispositivos=cs.${q("{" + JSON.stringify(dispositivo) + "}")}&order=creada.desc&limit=1`);
  return filas[0] || null;
}

export async function consultaExiste(id) {
  const filas = await rest(`arcana_consultas?select=id&id=eq.${q(id)}&limit=1`);
  return filas.length > 0;
}

export async function contarConsultas(dispositivo) {
  const filas = await rest(`arcana_consultas?select=id&dispositivo=eq.${q(dispositivo)}&id=not.like.*:*`);
  return filas.length;
}

// Marcas: m: = mensaje enviado a la IA, v: = baraja virtual sin cobro extra. No son consultas.
export async function registrarMarca(prefijo, dispositivo, ip) {
  await rest("arcana_consultas", { method: "POST", prefer: "resolution=ignore-duplicates", body: { id: `${prefijo}:${randomUUID()}`, dispositivo, ip, suscriptora_id: null } });
}

export async function contarMarcas(prefijo, dispositivo, desde) {
  const filas = await rest(`arcana_consultas?select=id&dispositivo=eq.${q(dispositivo)}&id=like.${q(prefijo + ":*")}${desde ? `&creada=gte.${q(desde)}` : ""}`);
  return filas.length;
}

// Marcas de referidas: r:CODIGO (llegó invitada), k:DISPOSITIVO (ya se premió esa referida), b (bono), u (bono usado).
export async function marcasDe(prefijo, dispositivo) {
  return rest(`arcana_consultas?select=id&dispositivo=eq.${q(dispositivo)}&id=like.${q(prefijo + ":*")}`);
}
export async function existeMarca(prefijo) {
  const filas = await rest(`arcana_consultas?select=id&id=like.${q(prefijo + ":*")}&limit=1`);
  return filas.length > 0;
}
export async function dispositivoPorCodigo(codigo) {
  const filas = await rest(`arcana_consultas?select=dispositivo&dispositivo=ilike.${q(codigo + "*")}&limit=1`);
  return filas[0] ? filas[0].dispositivo : null;
}

export async function ultimaConsulta(dispositivo) {
  const filas = await rest(`arcana_consultas?select=id,creada&dispositivo=eq.${q(dispositivo)}&id=not.like.*:*&order=creada.desc&limit=1`);
  return filas[0] || null;
}

export async function contarGratisPorIp(ip, desde) {
  const filas = await rest(`arcana_consultas?select=id&ip=eq.${q(ip)}&suscriptora_id=is.null&id=not.like.*:*&creada=gte.${q(desde)}`);
  return filas.length;
}

export async function registrarConsulta(id, dispositivo, ip, suscriptoraId) {
  await rest("arcana_consultas", { method: "POST", prefer: "resolution=ignore-duplicates", body: { id, dispositivo, ip, suscriptora_id: suscriptoraId || null } });
}

export async function crearSolicitud({ nombre, telefono, email, dispositivo, referencia }) {
  const filas = await rest("arcana_suscriptoras", {
    method: "POST", prefer: "return=representation",
    body: { nombre, telefono, email, dispositivos: [dispositivo], referencia, acepto_datos: true },
  });
  return filas[0];
}

export async function buscarPorEmailTelefono(email, telefono) {
  const filas = await rest(`arcana_suscriptoras?select=id,estado,activa_hasta,dispositivos&email=eq.${q(email)}&telefono=eq.${q(telefono)}&order=creada.desc&limit=1`);
  return filas[0] || null;
}

export async function agregarDispositivo(id, dispositivos, dispositivo) {
  if (dispositivos.includes(dispositivo)) return;
  await rest(`arcana_suscriptoras?id=eq.${q(id)}`, { method: "PATCH", body: { dispositivos: [...dispositivos, dispositivo].slice(-2) } });
}

export async function listarSuscriptoras() {
  return rest("arcana_suscriptoras?select=id,nombre,telefono,email,estado,referencia,activa_hasta,creada&order=creada.desc&limit=500");
}

export async function obtenerSuscriptora(id) {
  const filas = await rest(`arcana_suscriptoras?select=id,estado,activa_hasta,referencia,dispositivos&id=eq.${q(id)}&limit=1`);
  return filas[0] || null;
}

export async function actualizarSuscriptora(id, cambios) {
  await rest(`arcana_suscriptoras?id=eq.${q(id)}`, { method: "PATCH", body: cambios });
}

// Opiniones (estrellas + comentario) que deja la clienta al final de la lectura.
export async function guardarOpinion({ dispositivo, estrellas, comentario, tirada, cartas }) {
  await rest("arcana_opiniones", { method: "POST", body: { dispositivo, estrellas, comentario: comentario || null, tirada: tirada || null, cartas: cartas || null } });
}
export async function contarOpinionesDesde(dispositivo, desde) {
  const filas = await rest(`arcana_opiniones?select=id&dispositivo=eq.${q(dispositivo)}&creada=gte.${q(desde)}`);
  return filas.length;
}
export async function listarOpiniones() {
  return rest("arcana_opiniones?select=id,estrellas,comentario,tirada,cartas,creada&order=creada.desc&limit=500");
}

// Conversaciones: una fila por consulta, con el texto (sin fotos ni notas internas). Se borran a los 90 días.
const DIAS_CONVERSACION = 90;
export async function guardarConversacion(consulta, dispositivo, mensajes, cliente) {
  const ahora = new Date().toISOString();
  await rest("arcana_conversaciones?on_conflict=consulta", { method: "POST", prefer: "resolution=merge-duplicates", body: { consulta, dispositivo, mensajes, actualizada: ahora, ...(cliente ? { cliente } : {}) } });
  if (Math.random() < 0.05) await borrarConversacionesViejas().catch(() => {});
}
export async function borrarConversacionesViejas() {
  const limite = new Date(Date.now() - DIAS_CONVERSACION * 864e5).toISOString();
  await rest(`arcana_conversaciones?actualizada=lt.${q(limite)}`, { method: "DELETE" });
}
export async function listarConversaciones() {
  return rest("arcana_conversaciones?select=consulta,dispositivo,cliente,mensajes,creada,actualizada&order=actualizada.desc&limit=150");
}

// Las marcas de mensajes ("m:") solo sirven para los topes recientes: se borran las de más de 7 días para que la tabla no crezca sin fin.
export async function limpiarMarcasViejas() {
  const hace = new Date(Date.now() - 7 * 864e5).toISOString();
  await rest(`arcana_consultas?id=like.${q("m:*")}&creada=lt.${q(hace)}`, { method: "DELETE" });
  await rest(`arcana_sesiones?expira=lt.${q(new Date().toISOString())}`, { method: "DELETE" }).catch(() => {});
}
