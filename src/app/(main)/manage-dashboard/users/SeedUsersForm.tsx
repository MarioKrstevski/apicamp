'use client'

import { SeedForm } from '../SeedForm'
import { seedUsersTable } from './actions'

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

const PLACEHOLDER = `Paste an array of user objects, e.g.
[{"name":"Jane","firstName":"Jane","lastName":"Doe","email":"jane@example.com","age":28},{"firstName":"John","lastName":"Smith","email":"john@example.com"}]`

export function SeedUsersForm() {
  return (
    <SeedForm
      action={seedUsersTable}
      sampleJson={SAMPLE_JSON}
      placeholder={PLACEHOLDER}
      submitLabel="Seed users"
      copyLabel="Copy template (all fields)"
      copyHint="One entry with every field; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
