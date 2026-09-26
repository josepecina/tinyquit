# TinyQuit

App para fumar (o vapear) menos, poco a poco, con Tiny.

**Versión 0.2 (beta):** datos reales desde el primer día. Las respuestas del alta pasan a la app, el día se cierra solo a tu hora, el calendario usa fechas reales y, si un día no abres la app, te pregunta cuántos fueron. En Ajustes: copia de seguridad (guardar/recuperar) y «Modo probador» (Premium de prueba y botones para simular).

- Ábrela en el móvil: https://josepecina.github.io/tinyquit/
- Instalar: en iPhone, Safari → Compartir → «Añadir a pantalla de inicio». En Android, Chrome → menú → «Instalar app».
- Tus datos se guardan solo en tu móvil (almacenamiento del navegador).
- Empezar de cero: abre la dirección con `?reset=1` al final.

## Cómo está hecha
- `index.html` + `app.js`: arranque, tamaño de pantalla y guardado.
- `tq-runtime.js`: pinta las pantallas (plantillas con `{{huecos}}`, `<sc-if>` y `<sc-for>`) usando React.
- `screens/`: alta (`onboarding.html`) y app (`main.html`).
- `sw.js` + `manifest.webmanifest`: funciona sin conexión y se puede instalar.
- `vendor/`: React 18.3.1 (licencia MIT).
