'use client'

import { SeedForm } from '../SeedForm'
import { seedDogsTable } from './actions'

/** Example: one full dog entry with all fields. Copy, paste, then edit. */
const SAMPLE_DOG = [
  {
    name: 'Rex',
    breed: 'German Shepherd',
    age: 3,
    ownerId: null
  }
]

const SAMPLE_JSON = JSON.stringify(SAMPLE_DOG, null, 2)

const PLACEHOLDER = `Paste an array of dog objects, e.g.
[{"name":"Rex","breed":"German Shepherd","age":3},{"name":"Buddy","breed":"Golden Retriever"}]`

export function SeedDogsForm() {
  return (
    <SeedForm
      action={seedDogsTable}
      sampleJson={SAMPLE_JSON}
      placeholder={PLACEHOLDER}
      submitLabel="Seed dogs"
      copyLabel="Copy template (all fields)"
      copyHint="One entry with every field; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
