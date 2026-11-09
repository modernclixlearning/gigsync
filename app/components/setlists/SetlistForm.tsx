import { useState } from 'react'
import { createSetlistSchema } from '~/lib/schemas'
import { Dialog, buttonClass, fieldClass, fieldLabelClass } from '~/components/layout'
import type { CreateSetlistInput, Setlist } from '~/types'

interface SetlistFormProps {
  setlist?: Setlist
  onSubmit: (data: CreateSetlistInput) => void
  onCancel: () => void
}

export function SetlistForm({ setlist, onSubmit, onCancel }: SetlistFormProps) {
  const [name, setName] = useState(setlist?.name ?? '')
  const [venue, setVenue] = useState(setlist?.venue ?? '')
  const [date, setDate] = useState(
    setlist?.date ? new Date(setlist.date).toISOString().split('T')[0] : ''
  )
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const raw = {
      name: name.trim(),
      venue: venue.trim() || undefined,
      date: date ? new Date(date) : undefined,
    }

    const result = createSetlistSchema.safeParse(raw)
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }

    onSubmit(result.data)
  }

  return (
    <Dialog title={setlist ? 'Editar setlist' : 'Nuevo setlist'} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="setlist-name" className={fieldLabelClass}>
            Nombre *
          </label>
          <input
            id="setlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Concierto del viernes"
            className={fieldClass}
            autoFocus
            required
          />
        </div>

        <div>
          <label htmlFor="setlist-venue" className={fieldLabelClass}>
            Lugar
          </label>
          <input
            id="setlist-venue"
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="p. ej. Sala Apolo"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="setlist-date" className={fieldLabelClass}>
            Fecha
          </label>
          <input
            id="setlist-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className={buttonClass('secondary', 'flex-1')}>
            Cancelar
          </button>
          <button type="submit" className={buttonClass('primary', 'flex-1')}>
            {setlist ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
