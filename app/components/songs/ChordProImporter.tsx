import { useState, useCallback } from 'react'
import { Upload, FileText, X, Check } from 'lucide-react'
import { cn } from '~/lib/utils'
import { parseChordProLegacy, type ChordProSong } from '~/lib/chordpro'

interface ChordProImporterProps {
  onImport: (song: ChordProSong) => void
  onCancel: () => void
}

export function ChordProImporter({ onImport, onCancel }: ChordProImporterProps) {
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<ChordProSong | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleParse = useCallback(() => {
    if (!content.trim()) return
    const parsed = parseChordProLegacy(content)
    setPreview(parsed)
  }, [content])

  const handleImport = useCallback(() => {
    if (preview) {
      onImport(preview)
    }
  }, [preview, onImport])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.cho') || file.name.endsWith('.chopro') || file.name.endsWith('.txt'))) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setContent(text)
      }
      reader.readAsText(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setContent(text)
      }
      reader.readAsText(file)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Import ChordPro
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drop Zone / File Input */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-slate-300 dark:border-slate-700'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          Drag & drop a ChordPro file here, or
        </p>
        <label className="inline-block">
          <input
            type="file"
            accept=".cho,.chopro,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className={cn(
            'inline-block px-4 py-2 rounded-lg cursor-pointer',
            'bg-slate-100 dark:bg-slate-800',
            'text-slate-700 dark:text-slate-300',
            'hover:bg-slate-200 dark:hover:bg-slate-700',
            'transition-colors text-sm font-medium'
          )}>
            Choose File
          </span>
        </label>
      </div>

      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Or paste ChordPro content:
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`{title: Song Name}
{artist: Artist Name}
{key: G}
{tempo: 120}

[Verse]
[G]Hello, [D]world
[Em]This is [C]a song`}
          rows={10}
          className={cn(
            'w-full px-4 py-3 rounded-xl font-mono text-sm',
            'bg-white dark:bg-[#1a1f36]',
            'border border-slate-200 dark:border-slate-700',
            'text-slate-900 dark:text-white',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500',
            'resize-y'
          )}
        />
      </div>

      {/* Parse Button */}
      <button
        onClick={handleParse}
        disabled={!content.trim()}
        className={cn(
          'w-full py-3 rounded-xl font-medium',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-700 dark:text-slate-300',
          'hover:bg-slate-200 dark:hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        <FileText className="w-4 h-4 inline mr-2" />
        Preview Import
      </button>

      {/* Preview */}
      {preview && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Preview
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p><strong>Title:</strong> {preview.title || '(not set)'}</p>
            <p><strong>Artist:</strong> {preview.artist || '(not set)'}</p>
            {preview.key && <p><strong>Key:</strong> {preview.key}</p>}
            {preview.tempo && <p><strong>Tempo:</strong> {preview.tempo} BPM</p>}
            <p><strong>Lines:</strong> {preview.lines.length}</p>
          </div>

          <button
            onClick={handleImport}
            className={cn(
              'w-full mt-4 py-3 rounded-xl font-medium',
              'bg-indigo-500 text-white',
              'hover:bg-indigo-600',
              'transition-colors'
            )}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Import Song
          </button>
        </div>
      )}
    </div>
  )
}
