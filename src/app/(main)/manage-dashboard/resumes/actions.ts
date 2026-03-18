'use server'

import { seedTableRows } from '../actions'
import type { SeedResult } from '../actions'

export async function seedResumes(json: string): Promise<SeedResult> {
  return seedTableRows('resumes', json)
}
