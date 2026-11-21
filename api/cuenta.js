// /api/cuenta — crear cuenta, entrar, salir y guardar los datos de la clienta (nacimiento, personas, lecturas).
import * as db from "../lib/db.js";
import * as cu from "../lib/cuentas.js";
import { leerCuerpo, idValido, ipDe } from "../lib/acceso.js";
import { buscarFecha } from "../lib/numerologia.js";
import { hayCorreo, enviarCorreo } from "../lib/correo.js";
import { saludoCuenta } from "../lib/perfil.js";

const fallos = new Map(); // intentos fallidos por conexión y hora (aproximado: memoria de cada servidor)
const MAX_CUENTAS_POR_EQUIPO = Number(process.env.MAX_CUENTAS_POR_EQUIPO || 3);
const limpio = (x, n) => String(x || "").replace(/[\[\]{}<>\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export const publica = (c) => ({ id: c.id, clave: cu.claveDeCuenta(c.id), nombre: c.nombre, email: c.email, telefono: c.telefono, datos: c.datos || {}, saludo: saludoCuenta(c) });

// Quien ya tenía un plan en este equipo antes de las cuentas lo conserva al entrar.
async function vincularPlanAnterior(legado, cuenta) {
  if (!idValido(legado) || legado.startsWith("c")) return;
  const clave = cu.claveDeCuenta(cuenta.id);
  const subs = await db.suscripcionesActivasDe(legado).catch(() => []);
  for (const s of subs) {
    const completa = await db.obtenerSuscriptora(s.id);
    if (completa && !completa.dispositivos.includes(clave)) await db.actualizarSuscriptora(s.id, { dispositivos: [...completa.dispositivos, clave] });
  }
}

export default async function handler(req, res) {
  if (!db.hayBaseDeDatos() || !(await cu.cuentasListas())) return res.status(503).json({ error: "Las cuentas aún no están activas." });
  const ip = ipDe(req);
  try {
    if (req.method === "GET") {
      let c;
      try { c = await cu.cuentaDeToken(cu.tokenDe(req)); } catch (e) { console.error("Cuentas sin tablas", e); return res.status(503).json({ error: "Las cuentas aún no están activas." }); }
      if (!c) return res.status(401).json({ error: "Tu sesión terminó. Vuelve a entrar." });
      return res.status(200).json({ cuenta: publica(c) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    let b; try { b = leerCuerpo(req); } catch { return res.status(400).json({ error: "Datos no válidos." }); }
    const hora = new Date().toISOString().slice(0, 13), k = hora + "|" + ip;

    if (b.accion === "registrar" || b.accion === "ingresar") {
      if ((fallos.get(k) || 0) >= 15) return res.status(429).json({ error: "Demasiados intentos. Espera un rato e intenta de nuevo." });
      const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
      const clave = String(b.clave || "");
      if (!cu.EMAIL.test(email)) return res.status(400).json({ error: "Escribe un email válido." });
      if (b.accion === "ingresar") {
        const c = await cu.verificarIngreso(email, clave);
        if (!c) { fallos.set(k, (fallos.get(k) || 0) + 1); if (fallos.size > 5000) fallos.clear(); return res.status(401).json({ error: "El email o la contraseña no coinciden." }); }
        await vincularPlanAnterior(String(b.legado || ""), c).catch(() => {});
        return res.status(200).json({ token: await cu.abrirSesion(c.id), cuenta: publica(c) });
      }
      // Crear cuenta
      const nombre = limpio(b.nombre, 120), telefono = String(b.telefono || "").replace(/[^\d+]/g, "").slice(0, 20);
      const fecha = limpio(b.fecha, 20), ciudad = limpio(b.ciudad, 60);
      if (nombre.length < 3 || !nombre.includes(" ")) return res.status(400).json({ error: "Escribe tus nombres y apellidos." });
      if (telefono.replace(/\D/g, "").length < 9) return res.status(400).json({ error: "Escribe un WhatsApp válido, por ejemplo 0991234567." });
      if (clave.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
      // La fecha y la ciudad de nacimiento son opcionales aquí: Arcana las pregunta en la conversación.
      if (fecha && !buscarFecha(fecha)) return res.status(400).json({ error: "Escribe tu fecha de nacimiento, por ejemplo 03/03/1990." });
      if (b.acepto !== true) return res.status(400).json({ error: "Necesitamos tu autorización para guardar tus datos." });
      if (await cu.buscarCuentaPorEmail(email)) return res.status(409).json({ error: "Ya existe una cuenta con ese email. Toca «Ya tengo cuenta» para entrar." });
      const legado = idValido(b.legado) ? String(b.legado) : null;
      if (legado && (await cu.contarCuentasDeEquipo(legado)) >= MAX_CUENTAS_POR_EQUIPO) return res.status(429).json({ error: "Desde este equipo ya se crearon varias cuentas. Entra con una de ellas." });
      const c = await cu.crearCuenta({ nombre, email, telefono, clave, datos: { ...(fecha && ciudad.length >= 2 ? { fecha, ciudad } : {}), otros: [], lecturas: [] }, dispositivo: legado });
      await vincularPlanAnterior(legado || "", c).catch(() => {});
      return res.status(200).json({ token: await cu.abrirSesion(c.id), cuenta: publica(c) });
    }

    // Olvidé mi contraseña: enviar el código y luego cambiarla con él.
    if (b.accion === "recuperar" || b.accion === "restablecer") {
      if ((fallos.get(k) || 0) >= 15) return res.status(429).json({ error: "Demasiados intentos. Espera un rato e intenta de nuevo." });
      const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
      if (!cu.EMAIL.test(email)) return res.status(400).json({ error: "Escribe el email de tu cuenta." });
      if (b.accion === "recuperar") {
        if (!hayCorreo()) return res.status(503).json({ error: "Escríbele a Diana por WhatsApp y ella te ayuda a recuperar tu cuenta.", whatsapp: (process.env.WHATSAPP_DIANA || "").replace(/\D/g, "") || true });
        fallos.set(k, (fallos.get(k) || 0) + 1); // cada envío cuenta, para que nadie llene buzones ajenos
        const c = await cu.buscarCuentaPorEmail(email);
        if (c) {
          const codigo = await cu.crearCodigoRecuperacion(c.id);
          const nombre = String(c.nombre || "").split(" ")[0];
          await enviarCorreo({
            para: email, asunto: `Tu código de Diana Arcana: ${codigo}`,
            texto: `Hola ${nombre}:\n\nTu código para crear una contraseña nueva es ${codigo}\nVale por 20 minutos.\n\nSi no lo pediste, ignora este mensaje: tu cuenta sigue segura.\n\nDiana Arcana`,
            html: `<div style="font-family:Georgia,serif;max-width:420px;margin:auto;padding:24px;background:#120d24;color:#efe6ff;border-radius:14px"><p style="color:#d9b65e;letter-spacing:2px;font-size:13px">✦ DIANA ARCANA ✦</p><p>Hola ${nombre.replace(/[<>&]/g, "")}:</p><p>Tu código para crear una contraseña nueva es</p><p style="font-size:34px;letter-spacing:8px;color:#f3d98a;margin:12px 0">${codigo}</p><p style="font-size:13px;color:#b8a9d9">Vale por 20 minutos. Si no lo pediste, ignora este mensaje: tu cuenta sigue segura.</p></div>`,
          });
        }
        // Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados.
        return res.status(200).json({ ok: true });
      }
      const clave = String(b.clave || "");
      if (clave.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
      const r = await cu.restablecerClave(email, String(b.codigo || ""), clave);
      if (r.error) { fallos.set(k, (fallos.get(k) || 0) + 1); return res.status(400).json({ error: r.error }); }
      return res.status(200).json({ token: await cu.abrirSesion(r.cuenta.id), cuenta: publica(r.cuenta) });
    }

    const token = cu.tokenDe(req);
    if (b.accion === "salir") { await cu.cerrarSesion(token).catch(() => {}); return res.status(200).json({ ok: true }); }
    const c = await cu.cuentaDeToken(token);
    if (!c) return res.status(401).json({ error: "Tu sesión terminó. Vuelve a entrar." });
    if (b.accion === "lectura") {
      const l = b.lectura || {};
      const r = { f: limpio(l.f, 10), t: limpio(l.t, 60), c: limpio(l.c, 200), x: limpio(l.x, 400) };
      if (!r.t) return res.status(400).json({ error: "Lectura vacía." });
      const datos = c.datos || {};
      datos.lecturas = [r, ...(datos.lecturas || [])].slice(0, 8);
      await cu.guardarDatosCuenta(c.id, datos);
      return res.status(200).json({ ok: true, cuenta: publica({ ...c, datos }) });
    }
    return res.status(400).json({ error: "Acción no válida." });
  } catch (e) {
    console.error("Cuenta", e);
    return res.status(500).json({ error: "Algo salió mal. Intenta de nuevo." });
  }
}
