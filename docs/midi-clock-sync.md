# Sync con DAW por MIDI Clock (Windows)

GigSync puede seguir el **tempo** y el **Start/Stop** de REAPER o Ableton Live recibiendo
MIDI Clock por Web MIDI. El DAW es el master: GigSync solo escucha (no manda nada al DAW).

- Navegadores: **Chrome o Edge** (Firefox no soporta Web MIDI).
- Qué se sincroniza: BPM (24 ticks de clock = 1 negra), Start (arranca desde el principio),
  Continue (sigue desde donde estaba) y Stop. El autoscroll y el metrónomo siguen al mismo
  transporte.
- Enganche de fase: además del tempo, GigSync compara una vez por negra su posición con la del
  clock y ajusta levemente el tempo para cerrar cualquier diferencia, así no se va corriendo en
  un tema largo.
- Qué no: posición dentro de la canción (Song Position Pointer), timecode (MTC), Ableton Link.

## 1. Puerto MIDI virtual: loopMIDI

Windows no trae un "cable MIDI" entre aplicaciones, así que hace falta uno virtual.

1. Instalá **loopMIDI** (gratis, de Tobias Erichsen).
2. Abrilo y creá un puerto con el botón **+** (por ejemplo `loopMIDI Port`).
3. Dejalo corriendo mientras uses el sync (podés activar "Autostart" en sus opciones).

Si el DAW ya estaba abierto cuando creaste el puerto, reinicialo para que lo vea.

## 2. Mandar clock desde el DAW

### Ableton Live 12 (interfaz en español)

1. `Preferencias → Tempo & MIDI`.
2. En **Puertos de salida**, en la fila `loopMIDI Port`, marcá la columna **Sincro**
   (no hace falta **Pista** ni **Remoto**).
3. Opcional: el triángulo ▶ de esa fila muestra más opciones; si aparece el tipo de MIDI Clock,
   dejalo en **Song** para que también mande Start/Stop con el transporte.

En Live 11 o anterior (o en inglés) la pestaña se llama `Link, Tempo & MIDI` / `Link/Tempo/MIDI`,
la sección **MIDI Ports** y la columna **Sync**.

### REAPER

1. `Options → Preferences → Audio → MIDI Devices` (en la lista de **MIDI outputs**).
2. Click derecho sobre `loopMIDI Port` → **Enable output**.
3. Activá el envío de clock para ese dispositivo: click derecho → **Send clock/SPP** (según la
   versión de REAPER la opción puede aparecer como "Send clock to output" o dentro de
   "Configure output…").
4. Aplicá. El clock sale solo mientras el proyecto está reproduciendo.

## 3. Activarlo en GigSync

1. `Perfil → Settings → Sync con DAW (MIDI Clock)` → activá **Seguir MIDI Clock**.
2. El navegador pide permiso para acceder a dispositivos MIDI: aceptalo.
3. En **Puerto MIDI de entrada** elegí `loopMIDI Port`. Si tenés un teclado MIDI conectado
   (por ejemplo un MiniLab), no dejes "Automático": podría tomar el teclado en vez del DAW.
4. Dale play en el DAW: la fila muestra el BPM que está llegando. Si no aparece nada, revisá
   que el DAW esté mandando clock a ese puerto.
5. Abrí una canción en el reproductor y hacé al menos un click en la página (el navegador exige
   un gesto del usuario para habilitar el audio). A partir de ahí el play/stop del DAW maneja el
   reproductor y el header muestra `NNN BPM · MIDI`.

Si el sync está activado pero no hay Web MIDI, se negó el permiso o el puerto no está
conectado, GigSync muestra un aviso y sigue con el BPM de la canción.

## 4. Ajustar la compensación de latencia

GigSync arranca en el instante en que llega el Start del DAW y ya descuenta la latencia de
salida de audio que informa el navegador. Lo que queda depende de tu placa de audio y del
driver del DAW:

1. Activá el metrónomo en el DAW y en el reproductor de GigSync y dale play.
2. Si el click de GigSync suena **después** que el del DAW, subí
   **Compensación de latencia** (`+` adelanta GigSync); si suena **antes**, bajala.
3. Ajustá de a 5–10 ms hasta que los dos clicks suenen como uno.

## Limitaciones conocidas

- El BPM se estima promediando los ticks de los últimos compases (para filtrar el jitter), así
  que un cambio de tempo en el DAW tarda uno o dos tiempos en reflejarse, y el enganche de fase
  tarda unos tiempos más en cerrar la diferencia que se abrió durante el cambio.
- Al arrancar, el primer tiempo puede no sonar en el metrónomo de GigSync: cuando el navegador
  procesa el Start, ese instante ya pasó y GigSync entra alineado a partir del siguiente.
- Continue reanuda desde la posición actual de GigSync, no desde la del DAW (falta Song Position
  Pointer).
