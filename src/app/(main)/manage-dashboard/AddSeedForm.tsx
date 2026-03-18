'use client'

import { useState } from 'react'
import { seedTableRows, type SeedResult as AddSeedDataResult } from './actions'

function addSeedData(table: string, json: string): Promise<AddSeedDataResult> {
  return seedTableRows(table, json)
}
import { Button } from '@/components/ui/button'

type Props = {
  table: string
}

export function AddSeedForm({ table }: Props) {
  const [json, setJson] = useState('')
  const [result, setResult] = useState<AddSeedDataResult | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setPending(true)
    try {
      const res = await addSeedData(table, json)
      setResult(res)
      if (res.ok && res.inserted > 0) setJson('')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='One object or array, e.g.\n{"name":"Widget","price":9.99,"table":"electronics"}\nor [{"name":"A",...},{"name":"B",...}]'
        className="min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        required
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add data'}
        </Button>
        {result && (
          <span
            className={
              result.ok
                ? 'text-sm text-green-600 dark:text-green-400'
                : 'text-sm text-destructive'
            }
          >
            {result.ok
              ? `${result.inserted} row(s) inserted`
              : result.error + (result.details?.length ? ` — ${result.details.join(' ')}` : '')}
          </span>
        )}
      </div>
    </form>
  )
}
