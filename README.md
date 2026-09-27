# TinyQuit

App para fumar (o vapear) menos, poco a poco, con Tiny.

**Versión 0.3.2 (beta):** conectado el envío de datos anónimos (Supabase, UE). Solo se envía si el usuario lo activa; las opiniones de «Danos tu opinión» siempre llegan.

**Versión 0.3.1 (beta):** Premium gratis para quien prueba la beta (sin modo probador visible), logros de mundo: se puede desbloquear 1 por mundo viendo 5 anuncios (ya no hay «saltar»), la música vuelve al tocar la pantalla tras salir de la app, el modo noche ya no salta al principio de Ajustes, y el precio de Premium baja con 8, 15 y 25 mundos.

**Versión 0.3:** toda la app en 12 idiomas (el idioma se elige en el alta o en Ajustes), Salud centrada en tu cuerpo (cajetillas, cartones, alquitrán y nicotina que no entraron; camino sin humo con ~50 beneficios que empieza tras un día entero a 0 y vuelve a 0 si fumas), objetivos de mundos de «% menos» y «días fumando menos», pregunta de motivo cada 7-10 cigarros o si fumas dos seguidos, «Tus motivos más comunes» en Progreso (Premium), Calculadora que no revela la respuesta al fallar y envío opcional de datos anónimos (se activa en el alta o en Ajustes; desactivado hasta conectar el servidor).

**Versión 0.2:** datos reales desde el primer día. Las respuestas del alta pasan a la app, el día se cierra solo a tu hora, el calendario usa fechas reales y, si un día no abres la app, te pregunta cuántos fueron. En Ajustes: copia de seguridad (guardar/recuperar) y «Modo probador» (Premium de prueba y botones para simular).

- Ábrela en el móvil: https://josepecina.github.io/tinyquit/
- Instalar: en iPhone, Safari → Compartir → «Añadir a pantalla de inicio». En Android, Chrome → menú → «Instalar app».
- Tus datos se guardan solo en tu móvil (almacenamiento del navegador).
- Empezar de cero: abre la dirección con `?reset=1` al final.

## Cómo está hecha
- `index.html` + `app.js`: arranque, tamaño de pantalla y guardado.
- `tq-runtime.js`: pinta las pantallas (plantillas con `{{huecos}}`, `<sc-if>` y `<sc-for>`) usando React.
- `i18n/`: diccionarios de traducción (la app está escrita en español y se traduce al pintar).
- `screens/`: alta (`onboarding.html`) y app (`main.html`).
- `sw.js` + `manifest.webmanifest`: funciona sin conexión y se puede instalar.
- `vendor/`: React 18.3.1 (licencia MIT).
