'use server'

import { seedTableRows } from '../actions'
import type { SeedResult } from '../actions'

export async function seedAnimals(json: string): Promise<SeedResult> {
  return seedTableRows('animals', json)
}
