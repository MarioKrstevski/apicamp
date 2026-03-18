'use server'

import type { SeedFormResult } from '../SeedForm'

/** Stub: replace with real Supabase insert when dogs table exists. */
export async function seedDogsTable(_json: string): Promise<SeedFormResult> {
  return {
    ok: false,
    error: 'Dogs table not set up yet',
    details: ['Add a dogs table and implement insert here.']
  }
}
