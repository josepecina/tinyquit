# TinyQuit

App para fumar (o vapear) menos, poco a poco, con Tiny.

**Versión 0.1 (prueba):** el prototipo de diseño funcionando como web app instalable. Todavía usa datos de ejemplo (septiembre 2026) y conserva los botones de «Prototipo» para probar.

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
