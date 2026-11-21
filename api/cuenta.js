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

const whatsappDiana = () => (process.env.WHATSAPP_DIANA || "").replace(/\D/g, "");
export const publica = (c) => ({ id: c.id, clave: cu.claveDeCuenta(c.id), nombre: c.nombre, email: cu.emailReal(c.email), telefono: c.telefono, datos: c.datos || {}, saludo: saludoCuenta(c) });

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
      const u = new URL(req.url || "/", "http://x");
      if (u.searchParams.get("ver") === "historial") {
        try { return res.status(200).json({ lecturas: await cu.listarLecturas(c.id) }); }
        catch (e) { return res.status(200).json({ lecturas: [], aviso: "El historial estará disponible muy pronto." }); }
      }
      const id = u.searchParams.get("lectura");
      if (id) {
        if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Lectura no válida." });
        const l = await cu.obtenerLectura(c.id, id).catch(() => null);
        return l ? res.status(200).json({ lectura: l }) : res.status(404).json({ error: "No encontré esa lectura." });
      }
      return res.status(200).json({ cuenta: publica(c) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    let b; try { b = leerCuerpo(req); } catch { return res.status(400).json({ error: "Datos no válidos." }); }
    const hora = new Date().toISOString().slice(0, 13), k = hora + "|" + ip;

    if (b.accion === "registrar" || b.accion === "ingresar") {
      if ((fallos.get(k) || 0) >= 15) return res.status(429).json({ error: "Demasiados intentos. Espera un rato e intenta de nuevo." });
      // Se entra con el WhatsApp y un PIN de 4 números. (Las cuentas creadas antes con email siguen entrando con su email.)
      const dato = String(b.telefono || b.email || "").trim().toLowerCase().slice(0, 200);
      const tel = cu.normalizarTelefono(dato);
      const email = dato.includes("@") ? dato : tel ? cu.emailDeTelefono(tel) : "";
      const clave = String(b.clave || "").trim();
      if (!email) return res.status(400).json({ error: "Escribe tu WhatsApp, por ejemplo 0991234567." });
      if (b.accion === "ingresar") {
        const r = await cu.verificarIngreso(email, clave);
        if (r && r.bloqueada) return res.status(423).json({ error: "Por seguridad bloqueamos esta cuenta tras varios intentos. Escríbele a Diana por WhatsApp y te da un PIN nuevo.", whatsapp: whatsappDiana() });
        if (!r) { fallos.set(k, (fallos.get(k) || 0) + 1); if (fallos.size > 5000) fallos.clear(); return res.status(401).json({ error: "El WhatsApp o el PIN no coinciden." }); }
        await vincularPlanAnterior(String(b.legado || ""), r).catch(() => {});
        return res.status(200).json({ token: await cu.abrirSesion(r.id), cuenta: publica(r) });
      }
      // Crear cuenta: nombre, WhatsApp y PIN.
      const nombre = limpio(b.nombre, 120);
      const fecha = limpio(b.fecha, 20), ciudad = limpio(b.ciudad, 60);
      if (nombre.length < 3 || !nombre.includes(" ")) return res.status(400).json({ error: "Escribe tu nombre y apellido." });
      if (!tel) return res.status(400).json({ error: "Escribe un WhatsApp válido, por ejemplo 0991234567." });
      if (!/^\d{4}$/.test(clave)) return res.status(400).json({ error: "Tu PIN debe tener 4 números." });
      if (fecha && !buscarFecha(fecha)) return res.status(400).json({ error: "Escribe tu fecha de nacimiento, por ejemplo 03/03/1990." });
      if (b.acepto !== true) return res.status(400).json({ error: "Necesitamos tu autorización para guardar tus datos." });
      if (await cu.buscarCuentaPorEmail(email)) return res.status(409).json({ error: "Ese WhatsApp ya tiene cuenta. Toca «Ya tengo cuenta» y entra con tu PIN." });
      const legado = idValido(b.legado) ? String(b.legado) : null;
      if (legado && (await cu.contarCuentasDeEquipo(legado)) >= MAX_CUENTAS_POR_EQUIPO) return res.status(429).json({ error: "Desde este equipo ya se crearon varias cuentas. Entra con una de ellas." });
      const c = await cu.crearCuenta({ nombre, email, telefono: tel, clave, datos: { ...(fecha && ciudad.length >= 2 ? { fecha, ciudad } : {}), otros: [], lecturas: [] }, dispositivo: legado });
      await vincularPlanAnterior(legado || "", c).catch(() => {});
      return res.status(200).json({ token: await cu.abrirSesion(c.id), cuenta: publica(c) });
    }
    if (b.accion === "ayuda") return res.status(200).json({ whatsapp: whatsappDiana() });

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
      // La lectura completa va al historial (si la tabla aún no existe, no pasa nada).
      let idHistorial = null;
      if (b.completa && typeof b.completa === "object") idHistorial = await cu.guardarLecturaCompleta(c.id, b.completa).catch((e) => { console.error("Historial", e.message); return null; });
      return res.status(200).json({ ok: true, idHistorial, cuenta: publica({ ...c, datos }) });
    }
    if (b.accion === "lectura_act") {
      if (!/^[0-9a-f-]{36}$/i.test(String(b.id || ""))) return res.status(400).json({ error: "Lectura no válida." });
      await cu.actualizarLecturaCompleta(c.id, b.id, b.textos).catch(() => {});
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "Acción no válida." });
  } catch (e) {
    console.error("Cuenta", e);
    return res.status(500).json({ error: "Algo salió mal. Intenta de nuevo." });
  }
}
