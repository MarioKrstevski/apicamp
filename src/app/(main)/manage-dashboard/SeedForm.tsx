'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export type SeedFormResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; details?: string[] }

export type SeedFormProps = {
  /** Server action that accepts JSON string and returns SeedFormResult */
  action: (json: string) => Promise<SeedFormResult>
  /** Template JSON string to copy (e.g. one entry with all fields) */
  sampleJson: string
  /** Textarea placeholder */
  placeholder?: string
  /** Submit button label (default: "Seed") */
  submitLabel?: string
  /** Copy button label (default: "Copy template (all fields)") */
  copyLabel?: string
  /** Hint next to copy button (default: "One entry with every field; paste and edit.") */
  copyHint?: string
  /** Called after successful insert (e.g. reload). Optional. */
  onSuccess?: () => void
}

const DEFAULT_PLACEHOLDER = 'Paste a JSON array of objects, e.g.\n[{"id": "1", "name": "..."}, {...}]'
const DEFAULT_SUBMIT_LABEL = 'Seed'
const DEFAULT_COPY_LABEL = 'Copy template (all fields)'
const DEFAULT_COPY_HINT = 'One entry with every field; paste and edit.'

export function SeedForm({
  action,
  sampleJson,
  placeholder = DEFAULT_PLACEHOLDER,
  submitLabel = DEFAULT_SUBMIT_LABEL,
  copyLabel = DEFAULT_COPY_LABEL,
  copyHint = DEFAULT_COPY_HINT,
  onSuccess
}: SeedFormProps) {
  const [json, setJson] = useState('')
  const [result, setResult] = useState<SeedFormResult | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopyTemplate() {
    try {
      await navigator.clipboard.writeText(sampleJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setJson(sampleJson)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setPending(true)
    try {
      const res = await action(json)
      setResult(res)
      if (res.ok && res.inserted > 0) {
        setJson('')
        onSuccess?.()
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
          {copied ? 'Copied!' : copyLabel}
        </Button>
        <span className="text-xs text-muted-foreground">
          {copyHint}
        </span>
      </div>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        required
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Inserting…' : submitLabel}
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
