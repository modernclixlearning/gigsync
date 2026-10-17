import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { SongLiveEditor } from '../SongLiveEditor'
import type { Song } from '~/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

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
