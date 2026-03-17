'use client'

import { useState } from 'react'
import { addSeedData, type AddSeedDataResult } from './actions'
import { Button } from '@/components/ui/button'

type Props = {
  category: string
}

export function AddSeedForm({ category }: Props) {
  const [json, setJson] = useState('')
  const [result, setResult] = useState<AddSeedDataResult | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setPending(true)
    try {
      const res = await addSeedData(category, json)
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
        placeholder='One object or array, e.g.\n{"name":"Widget","price":9.99,"category":"electronics"}\nor [{"name":"A",...},{"name":"B",...}]'
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
