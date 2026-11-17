# Mascotacvm

Mascota animada (babosa azul con lentes) como Web Component `<slime-mascot>`, sin dependencias.

```html
<script src="dist/mascota.js" defer></script>
<script src="dist/mascota-poses.js" defer></script>   <!-- opcional: otros ángulos y gestos -->
<script src="dist/mascota-trajes.js" defer></script>  <!-- opcional: trajes por fecha -->
<slime-mascot size="230" intro shy costume="auto"></slime-mascot>
```

- `dist/mascota.js`: componente (animaciones, arrastre, tutorial guiado, accesibilidad).
- `dist/mascota-poses.js`: poses dibujadas de cuerpo completo (18, solo de ChatGPT: ocho ángulos y gestos de la hoja de bocetos) —
  `spin`, `jump`, `excited`, `wink`, `gasp`, `lean` y los bucles `front`, `away`, `crawl`, `nap`, `sit`, `sad`, `ponder`.
- `dist/mascota-trajes.js`: 15 trajes (Navidad, Semana Santa, Independencia…).
- `dist/demo-mascota.html`: demo con todo incluido; ábrela en el navegador.
- `src/`: plantillas del componente y la demo, `costumes.json`, anclas de poses, la hoja de bocetos y las tandas 1 y 2 de ChatGPT (`src/poses/`).
- `tools/`: scripts de construcción en Python (`build_poses.py` → `build3.py` → `build_costumes.py`).

La documentación completa de atributos, métodos y eventos está en el encabezado de `dist/mascota.js`.
