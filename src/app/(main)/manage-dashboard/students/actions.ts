'use server'

import { seedTableRows } from '../actions'
import type { SeedResult } from '../actions'

export async function seedStudents(json: string): Promise<SeedResult> {
  return seedTableRows('students', json)
}
