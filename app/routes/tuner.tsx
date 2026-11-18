import { createFileRoute } from '@tanstack/react-router'
import { TunerView } from '~/components/tuner/TunerView'
import { Page } from '~/components/layout'

export const Route = createFileRoute('/tuner')({
  component: TunerPage,
})

function TunerPage() {
  return (
    <Page title="Afinador" subtitle="Cromático, con el micrófono del dispositivo">
      <TunerView layout="page" />
    </Page>
  )
}
