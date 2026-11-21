// Cuentas de clientas: email + contraseña, sesiones con token. Todo pasa por el servidor con la clave de servicio.
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { rest, q } from "./db.js";

const scrypt = promisify(_scrypt);
const DIAS_SESION = 180;
export const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

// La cuenta reemplaza al "dispositivo" en las reglas de acceso: consultas gratis, planes y conversaciones.
export const claveDeCuenta = (id) => "c" + String(id).replace(/-/g, "");

export async function hashClave(clave) {
  const sal = randomBytes(16);
  const h = await scrypt(String(clave), sal, 32);
  return `scrypt$${sal.toString("hex")}$${h.toString("hex")}`;
}
async function claveCorrecta(clave, guardada) {
  const [tipo, salHex, hHex] = String(guardada || "").split("$");
  if (tipo !== "scrypt" || !salHex || !hHex) return false;
  const h = await scrypt(String(clave), Buffer.from(salHex, "hex"), 32);
  const esperado = Buffer.from(hHex, "hex");
  return esperado.length === h.length && timingSafeEqual(esperado, h);
}
const huella = (token) => createHash("sha256").update(String(token)).digest("hex");

export async function buscarCuentaPorEmail(email) {
  const f = await rest(`arcana_cuentas?select=id,nombre,email,telefono,clave,datos&email=eq.${q(email)}&limit=1`);
  return f[0] || null;
}
export async function contarCuentasDeEquipo(dispositivo) {
  const f = await rest(`arcana_cuentas?select=id&dispositivo_alta=eq.${q(dispositivo)}`);
  return f.length;
}
export async function crearCuenta({ nombre, email, telefono, clave, datos, dispositivo }) {
  const f = await rest("arcana_cuentas", { method: "POST", prefer: "return=representation", body: { nombre, email, telefono, clave: await hashClave(clave), datos: datos || {}, dispositivo_alta: dispositivo || null } });
  return f[0];
}
// Tras 10 PIN equivocados la cuenta se pausa 30 minutos (así nadie adivina el PIN, y tampoco puede dejar a la dueña afuera para siempre).
// Diana puede desbloquearla antes poniendo un PIN nuevo en el panel.
const MAX_FALLOS_CUENTA = 10, MINUTOS_BLOQUEO = 30;
export async function verificarIngreso(email, clave) {
  const f = await rest(`arcana_cuentas?select=id,nombre,email,telefono,clave,datos,recuperar_intentos,recuperar_expira&email=eq.${q(email)}&limit=1`);
  const c = f[0];
  if (!c) return null;
  let fallos = c.recuperar_intentos || 0;
  if (fallos >= MAX_FALLOS_CUENTA) {
    if (c.recuperar_expira && new Date(c.recuperar_expira) > new Date()) return { bloqueada: true };
    fallos = 0; // ya pasó la pausa
  }
  if (!(await claveCorrecta(clave, c.clave))) {
    fallos += 1;
    await rest(`arcana_cuentas?id=eq.${q(c.id)}`, { method: "PATCH", body: { recuperar_intentos: fallos, ...(fallos >= MAX_FALLOS_CUENTA ? { recuperar_expira: new Date(Date.now() + MINUTOS_BLOQUEO * 6e4).toISOString() } : {}) } }).catch(() => {});
    return null;
  }
  if (c.recuperar_intentos) await rest(`arcana_cuentas?id=eq.${q(c.id)}`, { method: "PATCH", body: { recuperar_intentos: 0, recuperar_expira: null } }).catch(() => {});
  return c;
}
// El WhatsApp es el usuario: se guarda como 593XXXXXXXXX y como clave interna única "593...@whatsapp.arcana".
export function normalizarTelefono(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (/^0\d{9}$/.test(d)) d = "593" + d.slice(1);
  else if (/^9\d{8}$/.test(d)) d = "593" + d;
  return d.length >= 9 && d.length <= 15 ? d : "";
}
export const emailDeTelefono = (tel) => tel + "@whatsapp.arcana";
export const emailReal = (e) => (/@whatsapp\.arcana$/.test(String(e || "")) ? "" : e);
export async function abrirSesion(cuentaId) {
  const token = randomBytes(32).toString("base64url");
  await rest("arcana_sesiones", { method: "POST", body: { token: huella(token), cuenta_id: cuentaId, expira: new Date(Date.now() + DIAS_SESION * 864e5).toISOString() } });
  await rest(`arcana_cuentas?id=eq.${q(cuentaId)}`, { method: "PATCH", body: { ultimo_ingreso: new Date().toISOString() } }).catch(() => {});
  return token;
}
export async function cerrarSesion(token) {
  if (token) await rest(`arcana_sesiones?token=eq.${q(huella(token))}`, { method: "DELETE" });
}
// Devuelve la cuenta de la sesión (sin la contraseña) o null.
export async function cuentaDeToken(token) {
  if (!token || String(token).length < 20) return null;
  const f = await rest(`arcana_sesiones?select=expira,arcana_cuentas(id,nombre,email,telefono,datos)&token=eq.${q(huella(token))}&limit=1`);
  const s = f[0];
  if (!s || new Date(s.expira) < new Date() || !s.arcana_cuentas) return null;
  return s.arcana_cuentas;
}
export const tokenDe = (req) => String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();

export async function guardarDatosCuenta(id, datos) {
  await rest(`arcana_cuentas?id=eq.${q(id)}`, { method: "PATCH", body: { datos } });
}
export async function listarCuentas() {
  return rest("arcana_cuentas?select=id,nombre,email,telefono,datos,creada,ultimo_ingreso,recuperar_intentos,recuperar_expira&order=creada.desc&limit=1000");
}
export async function cambiarClave(id, clave) {
  await rest(`arcana_cuentas?id=eq.${q(id)}`, { method: "PATCH", body: { clave: await hashClave(clave), recuperar_intentos: 0, recuperar_expira: null } });
  await rest(`arcana_sesiones?cuenta_id=eq.${q(id)}`, { method: "DELETE" }); // cierra sus sesiones abiertas
}

// Recuperar la contraseña: un código de 6 números que llega al email y vale 20 minutos (máximo 5 intentos).
export async function crearCodigoRecuperacion(id) {
  const { randomInt } = await import("node:crypto");
  const codigo = String(randomInt(0, 1e6)).padStart(6, "0");
  await rest(`arcana_cuentas?id=eq.${q(id)}`, { method: "PATCH", body: { recuperar_codigo: huella(id + ":" + codigo), recuperar_expira: new Date(Date.now() + 20 * 6e4).toISOString(), recuperar_intentos: 0 } });
  return codigo;
}
export async function restablecerClave(email, codigo, clave) {
  const f = await rest(`arcana_cuentas?select=id,nombre,email,telefono,datos,recuperar_codigo,recuperar_expira,recuperar_intentos&email=eq.${q(email)}&limit=1`);
  const c = f[0];
  if (!c || !c.recuperar_codigo || new Date(c.recuperar_expira) < new Date() || (c.recuperar_intentos || 0) >= 5) return { error: "El código venció. Pide uno nuevo." };
  const dado = Buffer.from(huella(c.id + ":" + String(codigo).replace(/\D/g, ""))), esperado = Buffer.from(c.recuperar_codigo);
  if (dado.length !== esperado.length || !timingSafeEqual(dado, esperado)) {
    await rest(`arcana_cuentas?id=eq.${q(c.id)}`, { method: "PATCH", body: { recuperar_intentos: (c.recuperar_intentos || 0) + 1 } });
    return { error: "El código no coincide. Revísalo en tu email." };
  }
  await cambiarClave(c.id, clave);
  await rest(`arcana_cuentas?id=eq.${q(c.id)}`, { method: "PATCH", body: { recuperar_codigo: null, recuperar_expira: null, recuperar_intentos: 0 } });
  return { cuenta: c };
}

// ¿Ya existen las tablas de cuentas en Supabase? (mientras no, el sitio sigue en el modo anterior por equipo)
let listas = false, revisado = 0;
export async function cuentasListas() {
  if (listas || Date.now() - revisado < 60e3) return listas;
  revisado = Date.now();
  try { await rest("arcana_sesiones?select=token&limit=1"); listas = true; } catch { listas = false; }
  return listas;
}

// Historial completo de lecturas (texto y cartas) para la pestaña «Mi historial».
const MAX_LECTURA = 40000; // caracteres de texto por lectura
const limpiarTextos = (t) => { const out = []; let n = 0; for (const x of (Array.isArray(t) ? t : []).slice(0, 30)) { const s = String(x || "").slice(0, 12000); if (n + s.length > MAX_LECTURA) break; n += s.length; out.push(s); } return out; };
const limpiarCartas = (c) => (Array.isArray(c) ? c : []).slice(0, 14).map((x) => ({ posicion: String(x && x.posicion || "").slice(0, 60), carta: String(x && x.carta || "").slice(0, 60), invertida: Boolean(x && x.invertida), imagen: /^\/[\w\/.-]{1,120}$/.test(String(x && x.imagen || "")) ? x.imagen : undefined }));
export async function guardarLecturaCompleta(cuentaId, { nombre, cartas, textos }) {
  const f = await rest("arcana_lecturas", { method: "POST", prefer: "return=representation", body: { cuenta_id: cuentaId, nombre: String(nombre || "Tu tirada").slice(0, 80), cartas: limpiarCartas(cartas), textos: limpiarTextos(textos) } });
  return f[0] ? f[0].id : null;
}
export async function actualizarLecturaCompleta(cuentaId, id, textos) {
  await rest(`arcana_lecturas?id=eq.${q(id)}&cuenta_id=eq.${q(cuentaId)}`, { method: "PATCH", body: { textos: limpiarTextos(textos) } });
}
export async function listarLecturas(cuentaId) {
  return rest(`arcana_lecturas?select=id,creada,nombre,cartas&cuenta_id=eq.${q(cuentaId)}&order=creada.desc&limit=100`);
}
export async function obtenerLectura(cuentaId, id) {
  const f = await rest(`arcana_lecturas?select=id,creada,nombre,cartas,textos&id=eq.${q(id)}&cuenta_id=eq.${q(cuentaId)}&limit=1`);
  return f[0] || null;
}
