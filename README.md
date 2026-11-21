# Diana Arcana

Web de Diana Arcana con **Arcana**, la asistente virtual que lee tarot, calcula la carta astral, crea rituales y lee registros akáshicos.

- `public/index.html`: página de inicio.
- `public/arcana.html`: conversación con Arcana (voz, micrófono, foto de la tirada y tirada virtual).
- `api/chat.js`: servidor que habla con Claude. La clave de Anthropic vive solo aquí.
- `lib/prompt.js`: instrucciones de Arcana (su forma de hablar y sus reglas). Edita este archivo para cambiar cómo lee.
- `lib/astro.js`: cálculo de la carta astral (planetas, Ascendente, Medio Cielo, casas por signo entero).
- `lib/mazo.js`: mazo Rider-Waite de 78 cartas y la tirada virtual.
- `lib/acceso.js`, `lib/db.js`, `api/suscribir.js`, `api/acceder.js`: consultas gratis y planes (24 horas y semanal).
- `public/admin.html` + `api/admin.js`: panel de Diana para activar suscripciones (abre `/admin.html`).
- `supabase/esquema.sql`: tablas de la base de datos (Supabase).

## Publicar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub y elige **Add New → Project**.
2. Importa el repositorio `diana-arcana`. Deja las opciones como vienen y no pulses Deploy todavía.
3. Abre **Environment Variables** y agrega:
   - `ANTHROPIC_API_KEY`: tu clave de [console.anthropic.com](https://console.anthropic.com).
   - `LIMITE_DIARIO` (opcional): mensajes por persona por día. Por defecto, 250 (protege contra abusos; alcanza para varias lecturas al día).
4. Pulsa **Deploy**. En un minuto tendrás un enlace como `diana-arcana.vercel.app`.

Cada vez que se sube un cambio a GitHub, Vercel publica la nueva versión sola.

## Suscripción

Cada persona tiene 2 consultas gratis. Cada tirada, carta astral, ritual o lectura de registros akáshicos gasta una consulta; conversar no gasta. Planes: pase de 24 horas ($1.99, hasta 4 tiradas, referencia DD-) o semanal ($4.99, hasta 10 tiradas en 7 días, referencia DS-). Las referencias DA- antiguas (mensual) siguen funcionando con hasta 30 tiradas. El panel activa 24 horas o 7 días según la referencia. En la tercera, Arcana pide un plan: la persona llena nombre, teléfono y email, recibe la cuenta para depositar y un código de referencia, y envía el comprobante por WhatsApp. Diana entra a `/admin.html`, busca la referencia y pulsa **Activar**. Si la persona cambia de celular o navegador, usa "Ya soy suscriptora" con su email y teléfono.

Variables de entorno en Vercel:

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: de Supabase → Project Settings → API. Sin ellas, el límite está apagado y todo es gratis.
- `CUENTA_DEPOSITO`: banco, tipo y número de cuenta, nombre y cédula del titular (puede ir en varias líneas).
- `WHATSAPP_DIANA`: número con código de país, por ejemplo `593991234567`.
- `ADMIN_CLAVE`: clave del panel, mínimo 8 caracteres.
- Topes contra abusos (opcionales): `GRATIS_POR_IP` (4 gratis por conexión en 24 h), `MENSAJES_GRATIS` (45 mensajes sin plan), `MENSAJES_TRAS_ULTIMA` (20 mensajes tras la última consulta), `MENSAJES_DIA` (150 por equipo en 24 h). Los mensajes se marcan en arcana_consultas con id `m:...` (y `v:...` para barajas) y no cuentan como consultas.
- Opcionales: `CONSULTAS_GRATIS` (2), `PRECIO_DIA` (1.99), `PRECIO_SEMANAL` (4.99), `TIRADAS_DIA` (4), `TIRADAS_SEMANAL` (10).

## Costos

- Vercel: el plan Hobby es gratis pero no permite uso comercial; al cobrar conviene Vercel Pro ($20 al mes).
- Anthropic: se paga por uso. El modelo es Claude Opus 5.5 con esfuerzo bajo. Revisa el consumo en la consola de Anthropic.
- Voz y micrófono: los del navegador de cada persona, sin costo.

## Notas

- El límite diario por persona es aproximado (se reinicia cuando Vercel reinicia el servidor).
- La voz y el micrófono dependen del navegador: funcionan mejor en Chrome (Android y computador) y en Safari reciente (iPhone).

## Imágenes de las cartas

`public/cartas/` tiene las 78 ilustraciones originales de Pamela Colman Smith (1909), de dominio público. Son escaneos de la edición original, no de la recoloración de 1971, que sí tiene derechos de autor. Imágenes vía [Taro's Tarot](https://tarostarot.com/tarot-card-data).
