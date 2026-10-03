# Sync con DAW por MIDI Clock (Windows)

GigSync puede seguir el **tempo** y el **Start/Stop** de REAPER o Ableton Live recibiendo
MIDI Clock por Web MIDI. El DAW es el master: GigSync solo escucha (no manda nada al DAW).

- Navegadores: **Chrome o Edge** (Firefox no soporta Web MIDI).
- Qué se sincroniza: BPM (24 ticks de clock = 1 negra), Start (arranca desde el principio),
  Continue (sigue desde donde estaba) y Stop. El autoscroll y el metrónomo siguen al mismo
  transporte.
- Qué no: posición dentro de la canción (Song Position Pointer), timecode (MTC), Ableton Link.

## 1. Puerto MIDI virtual: loopMIDI

Windows no trae un "cable MIDI" entre aplicaciones, así que hace falta uno virtual.

1. Instalá **loopMIDI** (gratis, de Tobias Erichsen).
2. Abrilo y creá un puerto con el botón **+** (por ejemplo `loopMIDI Port`).
3. Dejalo corriendo mientras uses el sync (podés activar "Autostart" en sus opciones).

## 2. Mandar clock desde el DAW

### REAPER

1. `Options → Preferences → Audio → MIDI Devices` (en la lista de **MIDI outputs**).
2. Click derecho sobre `loopMIDI Port` → **Enable output**.
3. Activá el envío de clock para ese dispositivo: click derecho → **Send clock/SPP** (según la
   versión de REAPER la opción puede aparecer como "Send clock to output" o dentro de
   "Configure output…").
4. Aplicá. El clock sale solo mientras el proyecto está reproduciendo.

### Ableton Live

1. `Preferences → Link, Tempo & MIDI`.
2. En **MIDI Ports**, buscá la fila `Output: loopMIDI Port` y activá la columna **Sync**
   (en Live 11 o anterior la pestaña se llama `Link/Tempo/MIDI` o `MIDI`).
3. Opcional: en `MIDI Clock Type` dejá **Song** (manda Start/Stop con el transporte).

## 3. Activarlo en GigSync

1. `Perfil → Settings → Sync con DAW (MIDI Clock)` → activá **Seguir MIDI Clock**.
2. El navegador pide permiso para acceder a dispositivos MIDI: aceptalo.
3. En **Puerto MIDI de entrada** elegí `loopMIDI Port` (o dejá "Automático" si es el único).
4. Dale play en el DAW: la fila muestra el BPM que está llegando. Si no aparece nada, revisá
   que el DAW esté mandando clock a ese puerto.
5. Abrí una canción en el reproductor y hacé al menos un click en la página (el navegador exige
   un gesto del usuario para habilitar el audio). A partir de ahí el play/stop del DAW maneja el
   reproductor y el header muestra `NNN BPM · MIDI`.

Si el sync está activado pero no hay Web MIDI, se negó el permiso o el puerto no está
conectado, GigSync muestra un aviso y sigue con el BPM de la canción.

## Limitaciones conocidas

- El BPM se estima promediando los ticks de los últimos compases (para filtrar el jitter), así
  que un cambio de tempo en el DAW tarda uno o dos tiempos en reflejarse.
- No hay enganche de fase continuo: GigSync arranca alineado en cada Start y después sigue el
  tempo. Si en un tema largo se nota un corrimiento, Stop + Start en el DAW lo realinea.
- Continue reanuda desde la posición actual de GigSync, no desde la del DAW.
