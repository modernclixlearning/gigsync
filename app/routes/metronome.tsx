import { createFileRoute } from '@tanstack/react-router'
import { MetronomeView } from '~/components/metronome/MetronomeView'
import { Page } from '~/components/layout'

export const Route = createFileRoute('/metronome')({
  component: MetronomePage,
})

function MetronomePage() {
  return (
    <Page title="Metrónomo" subtitle="Marca el tempo y practica a click">
      <MetronomeView layout="page" />
    </Page>
  )
}
