'use client'

import { SeedForm } from '../SeedForm'
import { seedQuotes } from './actions'

const SAMPLE = JSON.stringify([
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "motivation",
    source: "Stanford Commencement Address",
    year: 2005,
    tags: ["work", "passion"]
  }
], null, 2)

export function SeedQuotesForm() {
  return (
    <SeedForm
      action={seedQuotes}
      sampleJson={SAMPLE}
      placeholder={`Paste an array of quote objects, e.g.\n[{"text":"...","author":"...","category":"motivation"}]`}
      submitLabel="Seed quotes"
      copyLabel="Copy template"
      copyHint="One entry with all fields; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
