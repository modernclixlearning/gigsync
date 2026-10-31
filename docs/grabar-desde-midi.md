# Grabar acordes desde un teclado MIDI

Tocás los acordes de la canción en un teclado MIDI con el click de GigSync y la progresión queda escrita como sección
de la canción (`[Grabación | N bars]` + `C | Am | F 2 | G 2 |`), lista para sumarle la letra después.

Funciona en Chrome o Edge en la compu (Web MIDI). Todo pasa en el navegador: no se sube nada.

## Pasos

1. Conectá el teclado por USB (por ejemplo el Arturia MiniLab 3) antes o después de abrir GigSync; aparece solo.
2. Abrí la canción → **Editar canción** → abajo de todo, «Importar ChordPro, detectar desde audio, grabar desde teclado
   MIDI o borrar» → **Grabar acordes desde teclado MIDI**. La primera vez el navegador pide permiso para MIDI.
3. Revisá:
   - **Teclado**: se elige solo el que no parece un puerto virtual o de control (en el MiniLab, `Minilab3 MIDI`, no
     `DIN THRU`, `MCU/HUI` ni `ALV`; tampoco `loopMIDI Port`).
   - **BPM**: el de la canción; si lo cambiás, al agregar la grabación también se guarda el BPM nuevo.
   - **Precuenta**: 0, 1 o 2 compases.
   - **Escuchar el teclado en el navegador**: el MiniLab no tiene sonido propio, así que GigSync toca lo que apretás con
     un sintetizador simple. Apagalo si ya lo oís por otro lado (por ejemplo, Ableton con el monitoreo activo).
4. Antes de grabar podés probar: el recuadro grande muestra el acorde que estás apretando.
5. **Grabar** → precuenta → tocá con el click. Mientras grabás se ve el compás y la progresión que se va armando.
6. **Parar**. Si parás un poco antes de la barra de compás, ese último compás igual cuenta.
7. Corregí lo que haga falta en el texto (un compás por celda; `G 2` = medio compás), poné el nombre de la sección y
   **Agregar a la canción**. Se agrega al final, sin tocar la letra existente. Guardá la canción como siempre.

## Cómo lee los acordes

- El tiempo 1 es el del click (no se adivina), y cada compás se lee entero o partido al medio cuando el acorde cambia en
  el tiempo 3 (en 4/4).
- Reconoce acordes mayores, menores, de séptima (`G7`) y menores con séptima (`Am7`). Otros (sus, maj7, dim,
  inversiones) salen como el más parecido de esos: corregilos en el texto.
- Tocá al menos tres notas por acorde. Un acorde tocado un poquito antes del tiempo cuenta para el compás que empieza.
- El pedal de sustain se respeta: las notas sostenidas con el pedal cuentan hasta que lo soltás.
- Los pads (canal MIDI 10) se ignoran.
- Las notas se ubican en el momento en que se oyó el click (la misma compensación de latencia de salida que usa el sync
  con el DAW), así que tocar "con lo que escuchás" cae en su lugar.
