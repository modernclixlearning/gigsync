# Grabar acordes desde un teclado MIDI

Tocás los acordes de la canción en un teclado MIDI con el click de GigSync y la progresión queda escrita como sección
de la canción (`[Grabación | N bars]` + `C | Am | F 2 | G 2 |`), lista para sumarle la letra después.

Funciona en Chrome o Edge en la compu (Web MIDI). Todo pasa en el navegador: no se sube nada.

## Pasos

1. Conectá el teclado por USB (por ejemplo el Arturia MiniLab 3) antes o después de abrir GigSync; aparece solo.
2. Abrí **Grabar acordes desde teclado MIDI** (se abre a pantalla completa; `Esc` o la X la cierran):
   - En una canción nueva: **Agregar canción** → el botón está arriba del formulario.
   - En una canción existente: abrí la canción → **Editar canción** → abajo de todo, «Importar ChordPro, detectar desde
     audio, grabar desde teclado MIDI o borrar».

   La primera vez el navegador pide permiso para MIDI.
3. Revisá:
   - **Teclado**: se elige solo el que no parece un puerto virtual o de control (en el MiniLab, `Minilab3 MIDI`, no
     `DIN THRU`, `MCU/HUI` ni `ALV`; tampoco `loopMIDI Port`).
   - **BPM** y **Tonalidad**: los de la canción; si los cambiás, al agregar la grabación también se guardan.
   - **Precuenta**: 0, 1 o 2 compases.
   - **Escuchar el teclado en el navegador**: el MiniLab no tiene sonido propio, así que GigSync toca lo que apretás con
     un sintetizador simple. Apagalo si ya lo oís por otro lado (por ejemplo, Ableton con el monitoreo activo).
4. Antes de grabar podés probar: el recuadro grande muestra el acorde que estás apretando.
5. **Grabar** (arriba a la derecha, junto a **Reproducir** y **Parar**) → precuenta → tocá con el click. Las notas van apareciendo en el carrete MIDI (piano roll), con el
   cursor en rojo, la grilla de compases y el acorde de cada compás arriba.
6. **Parar**. Si parás un poco antes de la barra de compás, ese último compás igual cuenta.
7. Revisá la toma en el carrete:
   - **Reproducir** / **Parar**: escuchás la toma con el click y el cursor.
   - **Grilla**: negras, corcheas, tresillos o semicorcheas. Dibuja las subdivisiones y todo lo que editás se ajusta a
     ella.
   - **Mover**: arrastrá una nota (a los costados cambia el momento; arriba/abajo, la nota). Suena al agarrarla.
   - **Estirar o acortar**: arrastrá el borde derecho de la nota.
   - **Agregar**: doble clic en un lugar vacío crea una nota de un paso de grilla; después la estirás.
   - **Borrar**: doble clic en la nota, o elegila con un clic y apretá Supr.
   - **Cuantizar**: lleva todas las notas a la grilla.
   - **+ Compás / − Compás**: alarga la toma al final para dibujar más allá de lo que tocaste (o quita compases vacíos).
   - **Deshacer**: vuelve atrás la última corrección.

   Cada corrección vuelve a armar los acordes y el texto de compases.
8. Corregí lo que haga falta en el texto (un compás por celda; `G 2` = medio compás), poné el nombre de la sección y
   **Agregar a la canción**. Se agrega al final, sin tocar la letra existente. Guardá la canción como siempre.

## Cómo lee los acordes

- El tiempo 1 es el del click (no se adivina), y cada compás se lee entero o partido al medio cuando el acorde cambia en
  el tiempo 3 (en 4/4).
- Reconoce acordes mayores, menores, de séptima (`G7`), menores con séptima (`Am7`), con séptima mayor (`Cmaj7`),
  semidisminuidos (`Bm7b5`), disminuidos (`Bdim`) y suspendidos (`Dsus4`). Otros (sus2, aug, 6, 9…) salen como el más
  parecido de esos: corregilos en el texto.
- Las inversiones se escriben con el bajo: si la nota más grave es otra nota del acorde, sale `C/E` (E-G-C) o
  `Am/C`. Si la usaste solo para enlazar voces y no querés la barra, borrala en el texto.
- Tocá al menos tres notas por acorde. Un acorde tocado un poquito antes del tiempo cuenta para el compás que empieza.
- El pedal de sustain se respeta: las notas sostenidas con el pedal cuentan hasta que lo soltás.
- Los pads (canal MIDI 10) se ignoran.
- Las notas se ubican en el momento en que se oyó el click (la misma compensación de latencia de salida que usa el sync
  con el DAW), así que tocar "con lo que escuchás" cae en su lugar.
