'use client'

import { useState } from 'react'
import { seedUsersTable, type SeedUsersTableResult } from './actions'
import { Button } from '@/components/ui/button'

/** One full user object with all possible fields (users config). Copy, paste, then edit. */
const SAMPLE_USER_ALL_FIELDS = [
  {
    name: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    age: 28,
    avatar: 'https://example.com/avatar.jpg',
    phone: '+1 555 123 4567',
    isActive: true,
    role: 'user',
    address: {
      street: 'Main Street',
      number: '42',
      city: 'New York',
      zip: '10001',
      country: 'USA'
    },
    tags: ['developer', 'early-adopter'],
    socialLinks: [
      { platform: 'github', url: 'https://github.com/janedoe' },
      { platform: 'linkedin', url: 'https://linkedin.com/in/janedoe' }
    ],
    birthDate: '1996-05-15'
  }
]

const SAMPLE_JSON = JSON.stringify(SAMPLE_USER_ALL_FIELDS, null, 2)

export function SeedUsersForm() {
  const [json, setJson] = useState('')
  const [result, setResult] = useState<SeedUsersTableResult | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopyTemplate() {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setJson(SAMPLE_JSON)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setPending(true)
    try {
      const res = await seedUsersTable(json)
      setResult(res)
      if (res.ok && res.inserted > 0) {
        setJson('')
        window.location.reload()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyTemplate}
          disabled={pending}
        >
          {copied ? 'Copied!' : 'Copy template (all fields)'}
        </Button>
        <span className="text-xs text-muted-foreground">
          One entry with every field; paste and edit.
        </span>
      </div>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={'Paste an array of user objects, e.g.\n[{"name":"Jane","firstName":"Jane","lastName":"Doe","email":"jane@example.com","age":28},{"firstName":"John","lastName":"Smith","email":"john@example.com"}]'}
        className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        required
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Inserting…' : 'Seed users'}
        </Button>
        {result?.ok && (
          <span className="text-sm text-green-600 dark:text-green-400">
            {result.inserted} row(s) inserted
          </span>
        )}
      </div>
      {result && !result.ok && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">{result.error}</p>
          {result.details && result.details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-destructive/90">
              {result.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
