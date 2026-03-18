'use server'

import { seedTableRows } from '../actions'
import type { SeedResult } from '../actions'

export async function seedQuotes(json: string): Promise<SeedResult> {
  return seedTableRows('quotes', json)
}
