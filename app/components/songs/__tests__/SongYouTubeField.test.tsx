import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SongYouTubeField, type SongYouTubeValue } from '../SongYouTubeField'

function Harness({ initial = {}, onValidity = vi.fn() }: { initial?: SongYouTubeValue; onValidity?: (v: boolean) => void }) {
  const [value, setValue] = useState<SongYouTubeValue>(initial)
  return (
    <>
      <SongYouTubeField
        artist="Soda Stereo"
        title="Persiana Americana"
        {...value}
        onChange={setValue}
        onValidityChange={onValidity}
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

const input = () => screen.getByLabelText('Video de YouTube (opcional)')
const value = () => JSON.parse(screen.getByTestId('value').textContent || '{}')

describe('SongYouTubeField', () => {
  it('links "Buscar en YouTube" to the results page in a new tab', () => {
    render(<Harness />)
    const link = screen.getByText('Buscar en YouTube').closest('a')!
    expect(link).toHaveAttribute(
      'href',
      'https://www.youtube.com/results?search_query=Soda%20Stereo%20Persiana%20Americana'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('stores a canonical link and takes the offset from t=', () => {
    render(<Harness />)
    fireEvent.change(input(), { target: { value: 'https://youtu.be/dQw4w9WgXcQ?t=1m5s' } })
    expect(value()).toEqual({ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', youtubeStartSeconds: 65 })
    expect(screen.getByLabelText('Empezar en')).toHaveValue(65)
    fireEvent.change(screen.getByLabelText('Empezar en'), { target: { value: '8' } })
    expect(value().youtubeStartSeconds).toBe(8)
  })

  it('shows an inline error and reports invalid for a bad link', () => {
    const onValidity = vi.fn()
    render(<Harness onValidity={onValidity} />)
    fireEvent.change(input(), { target: { value: 'https://vimeo.com/123' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Link no válido')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(onValidity).toHaveBeenLastCalledWith(false)
    fireEvent.change(input(), { target: { value: '' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onValidity).toHaveBeenLastCalledWith(true)
    expect(value()).toEqual({})
  })

  it('shows an existing link when editing a song', () => {
    render(<Harness initial={{ youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', youtubeStartSeconds: 4 }} />)
    expect(input()).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(screen.getByLabelText('Empezar en')).toHaveValue(4)
  })
})
