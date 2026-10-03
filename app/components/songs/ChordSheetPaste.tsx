import { useState, useMemo } from 'react'
import { ClipboardPaste, Check, X, Wand2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import { convertChordsOverLyrics, type ChordsOverLyricsResult } from '~/lib/chordpro'

interface ChordSheetPasteProps {
  /** Receives the converted ChordPro text to put into the lyrics field. */
  onApply: (chordPro: string) => void
}

const PLACEHOLDER = `[Verse]
G         D/F#      Em
Ella durmió al calor de las masas
C              G/B
Y yo desperté queriendo soñarla`

/** Render ChordPro text with `[Chord]` tokens highlighted. */
function HighlightedChordPro({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/(\[[^\]\n]+\])/g), [text])
  return (
    <>
      {parts.map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span key={i} className="text-indigo-600 dark:text-sky-400 font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function ChordSheetPaste({ onApply }: ChordSheetPasteProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<ChordsOverLyricsResult | null>(null)

  const reset = () => {
    setContent('')
    setPreview(null)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full px-4 py-3 rounded-xl',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-600 dark:text-slate-400',
          'hover:bg-slate-200 dark:hover:bg-slate-700',
          'transition-colors text-sm font-medium'
        )}
      >
        <ClipboardPaste className="w-4 h-4 inline mr-2" />
        Pegar cifrado (acordes sobre la letra)
      </button>
    )
  }

  const foundChords = preview ? preview.mergedLines + preview.chordOnlyLines > 0 : false

  return (
    <section className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pegar cifrado
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pegá un cifrado con los acordes en la línea de arriba de la letra y lo convertimos
            a ChordPro.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label="Cerrar pegar cifrado"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setPreview(null)
        }}
        placeholder={PLACEHOLDER}
        aria-label="Cifrado con acordes sobre la letra"
        rows={10}
        spellCheck={false}
        className={cn(
          'w-full px-4 py-3 rounded-xl font-mono text-sm whitespace-pre',
          'bg-white dark:bg-[#1a1f36]',
          'border border-slate-200 dark:border-slate-700',
          'text-slate-900 dark:text-white',
          'placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500',
          'resize-y'
        )}
      />

      <button
        type="button"
        onClick={() => setPreview(convertChordsOverLyrics(content))}
        disabled={!content.trim()}
        className={cn(
          'w-full py-3 rounded-xl font-medium',
          'bg-white dark:bg-[#1a1f36]',
          'border border-slate-200 dark:border-slate-700',
          'text-slate-700 dark:text-slate-300',
          'hover:bg-slate-50 dark:hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        <Wand2 className="w-4 h-4 inline mr-2" />
        Convertir y previsualizar
      </button>

      {preview && (
        <div className="space-y-2">
          <p
            className={cn(
              'text-xs',
              foundChords
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {foundChords
              ? `Vista previa: ${preview.mergedLines} líneas con acordes${
                  preview.chordOnlyLines ? `, ${preview.chordOnlyLines} solo de acordes` : ''
                }.`
              : 'No se detectaron líneas de acordes; se aplicaría el texto tal cual.'}
          </p>
          <pre
            data-testid="chordsheet-preview"
            className={cn(
              'max-h-72 overflow-auto px-4 py-3 rounded-xl font-mono text-sm whitespace-pre',
              'bg-white dark:bg-[#1a1f36]',
              'border border-slate-200 dark:border-slate-700',
              'text-slate-900 dark:text-white'
            )}
          >
            <HighlightedChordPro text={preview.chordPro} />
          </pre>
          <button
            type="button"
            onClick={() => {
              onApply(preview.chordPro)
              reset()
            }}
            className={cn(
              'w-full py-3 rounded-xl font-medium',
              'bg-indigo-500 text-white hover:bg-indigo-600',
              'transition-colors'
            )}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Usar como letra
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reemplaza la letra actual del formulario. No se guarda hasta que crees la canción.
          </p>
        </div>
      )}
    </section>
  )
}
