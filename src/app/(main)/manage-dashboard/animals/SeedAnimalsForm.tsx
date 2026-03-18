'use client'

import { SeedForm } from '../SeedForm'
import { seedAnimals } from './actions'

const SAMPLE = JSON.stringify([
  {
    name: "African Elephant",
    scientificName: "Loxodonta africana",
    type: "mammal",
    habitat: "savanna",
    diet: "herbivore",
    conservationStatus: "VU",
    weightKg: 4000,
    lifespanYears: 70,
    isNocturnal: false,
    funFact: "African elephants can recognise themselves in a mirror, one of very few non-human species with this ability.",
    nativeRegion: "Sub-Saharan Africa",
    speed: 40,
    tags: ["endangered", "social", "intelligent"]
  }
], null, 2)

export function SeedAnimalsForm() {
  return (
    <SeedForm
      action={seedAnimals}
      sampleJson={SAMPLE}
      placeholder={`Paste an array of animal objects, e.g.\n[{"name":"...","type":"mammal","habitat":"forest","diet":"herbivore"}]`}
      submitLabel="Seed animals"
      copyLabel="Copy template"
      copyHint="One entry with all fields; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
