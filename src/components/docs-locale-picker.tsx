'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getSupportedLocales } from '@/lib/supported-locales'

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  sr: 'Srpski'
}

export function DocsLocalePicker() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('locale') || 'en'
  const supported = getSupportedLocales()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'en') params.delete('locale')
    else params.set('locale', next)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="docs-locale" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        Results locale
      </label>
      <select
        id="docs-locale"
        value={current}
        onChange={handleChange}
        className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {supported.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc] ?? loc}
          </option>
        ))}
      </select>
    </div>
  )
}
