# Diana Arcana

Web de Diana Arcana con **Arcana**, la asistente virtual que lee tarot, calcula la carta astral, crea rituales y lee registros akáshicos.

- `public/index.html`: página de inicio.
- `public/arcana.html`: conversación con Arcana (voz, micrófono, foto de la tirada y tirada virtual).
- `api/chat.js`: servidor que habla con Claude. La clave de Anthropic vive solo aquí.
- `lib/prompt.js`: instrucciones de Arcana (su forma de hablar y sus reglas). Edita este archivo para cambiar cómo lee.
- `lib/astro.js`: cálculo de la carta astral (planetas, Ascendente, Medio Cielo, casas por signo entero).
- `lib/mazo.js`: mazo Rider-Waite de 78 cartas y la tirada virtual.
- `lib/acceso.js`, `lib/db.js`, `api/suscribir.js`, `api/acceder.js`: consultas gratis y suscripción mensual.
- `public/admin.html` + `api/admin.js`: panel de Diana para activar suscripciones (abre `/admin.html`).
- `supabase/esquema.sql`: tablas de la base de datos (Supabase).

## Publicar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub y elige **Add New → Project**.
2. Importa el repositorio `diana-arcana`. Deja las opciones como vienen y no pulses Deploy todavía.
3. Abre **Environment Variables** y agrega:
   - `ANTHROPIC_API_KEY`: tu clave de [console.anthropic.com](https://console.anthropic.com).
   - `LIMITE_DIARIO` (opcional): mensajes por persona por día. Por defecto, 60.
4. Pulsa **Deploy**. En un minuto tendrás un enlace como `diana-arcana.vercel.app`.

Cada vez que se sube un cambio a GitHub, Vercel publica la nueva versión sola.

## Suscripción

Cada persona tiene 3 consultas gratis (una consulta es una conversación; "Nueva consulta" empieza otra). En la cuarta, Arcana pide la suscripción: la persona llena nombre, teléfono y email, recibe la cuenta para depositar y un código de referencia, y envía el comprobante por WhatsApp. Diana entra a `/admin.html`, busca la referencia y pulsa **Activar 30 días**. Si la persona cambia de celular o navegador, usa "Ya soy suscriptora" con su email y teléfono.

Variables de entorno en Vercel:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: de Supabase → Project Settings → API. Sin ellas, el límite está apagado y todo es gratis.
- `CUENTA_DEPOSITO`: banco, tipo y número de cuenta, nombre y cédula del titular (puede ir en varias líneas).
- `WHATSAPP_DIANA`: número con código de país, por ejemplo `593991234567`.
- `ADMIN_CLAVE`: clave del panel, mínimo 8 caracteres.
- `CONSULTAS_GRATIS` (opcional, por defecto 3) y `PRECIO_MENSUAL` (opcional, por defecto 5).

## Costos

- Vercel: gratis en el plan Hobby.
- Anthropic: se paga por uso. El modelo es Claude Opus 5.5 con esfuerzo bajo. Revisa el consumo en la consola de Anthropic.
- Voz y micrófono: los del navegador de cada persona, sin costo.

## Notas

- El límite diario por persona es aproximado (se reinicia cuando Vercel reinicia el servidor).
- La voz y el micrófono dependen del navegador: funcionan mejor en Chrome (Android y computador) y en Safari reciente (iPhone).

## Imágenes de las cartas

`public/cartas/` tiene las 78 ilustraciones originales de Pamela Colman Smith (1909), de dominio público. Son escaneos de la edición original, no de la recoloración de 1971, que sí tiene derechos de autor. Imágenes vía [Taro's Tarot](https://tarostarot.com/tarot-card-data).
