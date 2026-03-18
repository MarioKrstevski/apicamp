'use client'

import { SeedForm } from '../SeedForm'
import { seedBooks } from './actions'

const SAMPLE = JSON.stringify([
  {
    title: "The Pragmatic Programmer",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0135957059",
    genre: "non-fiction",
    year: 1999,
    pages: 352,
    rating: 4.8,
    description: "A guide to becoming a better programmer through pragmatic thinking.",
    language: "English",
    tags: ["programming", "career", "best-practices"]
  }
], null, 2)

export function SeedBooksForm() {
  return (
    <SeedForm
      action={seedBooks}
      sampleJson={SAMPLE}
      placeholder={`Paste an array of book objects, e.g.\n[{"title":"...","author":"...","genre":"fiction"}]`}
      submitLabel="Seed books"
      copyLabel="Copy template"
      copyHint="One entry with all fields; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
