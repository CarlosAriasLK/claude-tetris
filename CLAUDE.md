# Tetris — Contexto del proyecto

Implementación del Tetris clásico en JavaScript vanilla sin dependencias. Proyecto educativo del curso de programación SENA.

## Stack

- **HTML5 Canvas** — dos `<canvas>`: `#board` (300×600 px) y `#next-canvas` (120×120 px)
- **CSS3** — dark theme, flexbox, `backdrop-filter` para overlays
- **JavaScript ES6+ vanilla** — un solo archivo `game.js`, sin build, sin bundler

## Estructura

```
03-tetris/
├── index.html   # DOM, dos canvas, panel lateral, overlay pausa/game-over
├── style.css    # Dark theme (fondo #0f0f17), estética retro arcade
└── game.js      # Toda la lógica del juego (~305 líneas)
```

## Arquitectura de game.js

### Constantes ajustables

| Constante      | Valor default | Notar                                            |
| -------------- | ------------- | ------------------------------------------------ |
| `COLS`         | 10            | Si cambia, ajustar `width` del canvas en HTML    |
| `ROWS`         | 20            | Si cambia, ajustar `height` del canvas en HTML   |
| `BLOCK`        | 30            | px por celda                                     |
| `LINE_SCORES`  | [0,100,300,500,800] | Multiplicados por `level`                  |
| `dropInterval` | 1000 ms       | Velocidad inicial; decrece con nivel             |

### Estado global

Variables sueltas en módulo: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `animId`.

### Funciones clave

- `init()` — reinicia todo el estado y arranca el loop
- `loop(ts)` — `requestAnimationFrame`; acumula dt, baja pieza cuando `dropAccum >= dropInterval`
- `collide(shape, ox, oy)` — detección de colisiones contra bordes y bloques fijados
- `tryRotate()` — rotación CW con wall kicks `[0, -1, 1, -2, 2]`
- `lockPiece()` → `merge()` + `clearLines()` + `spawn()`
- `clearLines()` — recorre de abajo a arriba; splice + unshift para eliminar filas completas
- `ghostY()` — proyecta posición final de la pieza actual (alpha 0.2 al dibujar)
- `hardDrop()` — score += distancia × 2; `softDrop()` — score += 1 por fila
- `draw()` — borra canvas, dibuja grid, tablero fijado, ghost, pieza actual
- `drawNext()` — dibuja la siguiente pieza centrada en `#next-canvas`
- `endGame()` / `togglePause()` — gestión de overlay

### Flujo de vida

```
init() → spawn() → requestAnimationFrame(loop)
loop: acumula dt → baja pieza o lockPiece() → draw() → rAF(loop)
keydown: ArrowLeft/Right, ArrowUp/X (rotar), ArrowDown (soft), Space (hard), P (pausa)
```

## Cómo ejecutar

Sin instalación. Abrir `index.html` en el navegador, o servir con:

```bash
python3 -m http.server 8000   # luego http://localhost:8000
npx serve .
```

## Convenciones de este proyecto

- Sin comentarios innecesarios en el código; los nombres de función son autoexplicativos.
- No agregar dependencias externas ni proceso de build.
- Si se modifica `COLS`, `ROWS` o `BLOCK`, actualizar también los atributos `width`/`height` del canvas en `index.html`.
- El canvas del tablero siempre debe ser `COLS × BLOCK` × `ROWS × BLOCK` píxeles.
