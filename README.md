# Diana Arcana

Web de Diana Arcana con **Arcana**, la asistente virtual que lee tarot, calcula la carta astral, crea rituales y lee registros akáshicos.

- `public/index.html`: página de inicio.
- `public/arcana.html`: conversación con Arcana (voz, micrófono, foto de la tirada y tirada virtual).
- `api/chat.js`: servidor que habla con Claude. La clave de Anthropic vive solo aquí.
- `lib/prompt.js`: instrucciones de Arcana (su forma de hablar y sus reglas). Edita este archivo para cambiar cómo lee.
- `lib/astro.js`: cálculo de la carta astral (planetas, Ascendente, Medio Cielo, casas por signo entero).
- `lib/mazo.js`: mazo Rider-Waite de 78 cartas y la tirada virtual.

## Publicar en Vercel

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub y elige **Add New → Project**.
2. Importa el repositorio `diana-arcana`. Deja las opciones como vienen y no pulses Deploy todavía.
3. Abre **Environment Variables** y agrega:
   - `ANTHROPIC_API_KEY`: tu clave de [console.anthropic.com](https://console.anthropic.com).
   - `LIMITE_DIARIO` (opcional): mensajes por persona por día. Por defecto, 60.
4. Pulsa **Deploy**. En un minuto tendrás un enlace como `diana-arcana.vercel.app`.

Cada vez que se sube un cambio a GitHub, Vercel publica la nueva versión sola.

## Costos

- Vercel: gratis en el plan Hobby.
- Anthropic: se paga por uso. El modelo es Claude Opus 5.5 con esfuerzo bajo. Revisa el consumo en la consola de Anthropic.
- Voz y micrófono: los del navegador de cada persona, sin costo.

## Notas

- El límite diario por persona es aproximado (se reinicia cuando Vercel reinicia el servidor).
- La voz y el micrófono dependen del navegador: funcionan mejor en Chrome (Android y computador) y en Safari reciente (iPhone).
