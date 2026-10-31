import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SongLiveEditor } from '../SongLiveEditor'
import type { Song } from '~/types'

const SONG: Song = {
  id: 's1',
  title: 'And I Love Her',
  artist: 'The Beatles',
  bpm: 120,
  key: 'F',
  timeSignature: '4/4',
  duration: 0,
  lyrics: '[Gm]Bright are the stars [Dm]that shine',
  tags: [],
  timesPlayed: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

const renderEditor = (song: Song, onSave = vi.fn().mockResolvedValue(undefined)) => {
  const utils = render(<SongLiveEditor song={song} onSave={onSave} isChordEditMode={false} />)
  return { ...utils, onSave }
}

describe('SongLiveEditor — ChordPro text', () => {
  it('starts read-only and "Editar" unlocks it', async () => {
    const user = userEvent.setup()
    renderEditor(SONG)
    const textarea = screen.getByLabelText('Lyrics & Chords') as HTMLTextAreaElement
    expect(textarea.readOnly).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Editar texto' }))
    expect(textarea.readOnly).toBe(false)
    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument()
  })

  it('saves what is typed once unlocked', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEditor(SONG)
    const textarea = screen.getByLabelText('Lyrics & Chords')
    await user.click(screen.getByRole('button', { name: 'Editar texto' }))
    await user.type(textarea, ' [[Bb]sky')
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ lyrics: SONG.lyrics + ' [Bb]sky' }))
  })

  it('follows chord edits made on the song, in real time', () => {
    const { rerender } = renderEditor(SONG)
    const edited = { ...SONG, lyrics: '[Gm]Bright are the stars [Bb]that shine' }
    rerender(<SongLiveEditor song={edited} onSave={vi.fn()} isChordEditMode />)
    expect((screen.getByLabelText('Lyrics & Chords') as HTMLTextAreaElement).value).toBe(edited.lyrics)
  })
})

describe('SongLiveEditor — tools in the panel', () => {
  it('imports a ChordPro file into the song, asking before replacing the lyrics', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { onSave } = renderEditor(SONG)
    await user.click(screen.getByRole('button', { name: 'Importar ChordPro' }))
    fireEvent.change(screen.getByPlaceholderText(/\{title: Song Name\}/), {
      target: { value: '{title: Yesterday}\n{tempo: 96}\n[F]Yesterday [Em]all my troubles' },
    })
    await user.click(screen.getByRole('button', { name: 'Preview Import' }))
    await user.click(screen.getByRole('button', { name: 'Import Song' }))
    expect(confirm).toHaveBeenCalled()
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Yesterday', bpm: 96, lyrics: '[F]Yesterday [Em]all my troubles' })
      )
    )
    expect(screen.queryByRole('button', { name: 'Preview Import' })).toBeNull()
    confirm.mockRestore()
  })

  it('opens the MIDI recording view from the panel', async () => {
    const user = userEvent.setup()
    renderEditor(SONG)
    await user.click(screen.getByRole('button', { name: 'Grabar acordes desde teclado MIDI' }))
    expect(screen.getByRole('dialog', { name: 'Grabar acordes desde teclado MIDI' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('deletes the song only after confirming, and only where deleting applies', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { rerender } = render(<SongLiveEditor song={SONG} onSave={vi.fn()} isChordEditMode={false} />)
    expect(screen.queryByRole('button', { name: 'Borrar canción' })).toBeNull()

    rerender(<SongLiveEditor song={SONG} onSave={vi.fn()} isChordEditMode={false} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: 'Borrar canción' }))
    expect(onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Borrar canción' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })
})
