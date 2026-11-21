// Envío de emails (código para recuperar la contraseña) desde el Gmail de Diana.
// Variables en Vercel: GMAIL_USUARIO (el correo) y GMAIL_CLAVE_APP (contraseña de aplicación de Google, no la normal).
export const hayCorreo = () => Boolean(process.env.GMAIL_USUARIO && process.env.GMAIL_CLAVE_APP);

export async function enviarCorreo({ para, asunto, texto, html }) {
  if (!hayCorreo()) throw new Error("Sin correo configurado");
  const { default: nodemailer } = await import("nodemailer");
  const t = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USUARIO, pass: String(process.env.GMAIL_CLAVE_APP).replace(/\s+/g, "") } });
  await t.sendMail({ from: `"Diana Arcana" <${process.env.GMAIL_USUARIO}>`, to: para, subject: asunto, text: texto, html });
}
