// Perfil de la clienta (nombre, nacimiento, otras personas y lecturas) a partir de su cuenta.
import { buscarFecha } from "./numerologia.js";
import { saludoDe, SALUDO } from "./prompt.js";

export const limpio = (x, n) => String(x || "").replace(/[\[\]{}<>\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export function perfilValido(p) {
  if (!p || typeof p !== "object") return null;
  const nombre = limpio(p.nombre, 80), fecha = limpio(p.fecha, 20), ciudad = limpio(p.ciudad, 60), relacion = limpio(p.relacion, 40);
  if (nombre.length < 2 || ciudad.length < 2 || !buscarFecha(fecha)) return null;
  const otros = Array.isArray(p.otros) ? p.otros.slice(0, 6).map((o) => perfilValido({ ...o, otros: null, lecturas: null })).filter(Boolean) : [];
  const lecturas = Array.isArray(p.lecturas) ? p.lecturas.slice(0, 5).map((l) => ({ f: limpio(l && l.f, 10), t: limpio(l && l.t, 60), c: limpio(l && l.c, 200), x: limpio(l && l.x, 400) })).filter((l) => l.t) : [];
  return { nombre, fecha, ciudad, ...(relacion ? { relacion } : {}), ...(otros.length ? { otros } : {}), ...(lecturas.length ? { lecturas } : {}) };
}

// Con fecha y ciudad guardadas devuelve el perfil completo; si faltan, null (Arcana se las pide).
export const perfilDeCuenta = (c) => c ? perfilValido({ nombre: c.nombre, ...(c.datos || {}) }) : null;

const primer = (n) => String(n || "").split(/\s+/)[0];
// Saludo cuando la cuenta aún no tiene la fecha y la ciudad de nacimiento.
export const saludoNuevo = (nombre) => `Te doy la bienvenida a este espacio sagrado, ${primer(nombre)}. Soy Arcana, la asistente virtual de Diana. Las cartas y las estrellas guardan mensajes para quien llega con el corazón abierto. Para sintonizar con tu energía, dime tu fecha de nacimiento y la ciudad donde naciste.`;
export function saludoCuenta(c) {
  if (!c) return SALUDO;
  const p = perfilDeCuenta(c);
  return p ? saludoDe(p) : saludoNuevo(c.nombre);
}

// Guarda en la cuenta lo que Arcana anotó con guardar_datos.
export function datosConPerfil(datos, p) {
  const d = { otros: [], lecturas: [], ...(datos || {}) };
  if (p.para === "titular") { d.fecha = p.fecha; d.ciudad = p.ciudad; }
  else {
    const mismo = (o) => limpio(o.nombre, 80).toLowerCase() === p.nombre.toLowerCase();
    d.otros = [{ nombre: p.nombre, fecha: p.fecha, ciudad: p.ciudad, ...(p.relacion ? { relacion: p.relacion } : {}) }, ...(d.otros || []).filter((o) => !mismo(o))].slice(0, 6);
  }
  return d;
}
