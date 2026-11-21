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
export async function verificarIngreso(email, clave) {
  const c = await buscarCuentaPorEmail(email);
  if (!c || !(await claveCorrecta(clave, c.clave))) return null;
  return c;
}
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
  return rest("arcana_cuentas?select=id,nombre,email,telefono,datos,creada,ultimo_ingreso&order=creada.desc&limit=1000");
}
export async function cambiarClave(id, clave) {
  await rest(`arcana_cuentas?id=eq.${q(id)}`, { method: "PATCH", body: { clave: await hashClave(clave) } });
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
