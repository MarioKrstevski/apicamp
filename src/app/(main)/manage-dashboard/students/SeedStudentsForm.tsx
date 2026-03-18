'use client'

import { SeedForm } from '../SeedForm'
import { seedStudents } from './actions'

const SAMPLE = JSON.stringify([
  {
    firstName: "Amelia",
    lastName: "Chen",
    studentId: "S2024042",
    email: "amelia.chen@university.edu",
    age: 20,
    grade: "sophomore",
    gpa: 3.75,
    major: "Computer Science",
    minor: "Mathematics",
    enrollmentYear: 2023,
    isActive: true,
    subjects: [
      { name: "Data Structures", code: "CS201", credits: 3, letterGrade: "A" },
      { name: "Calculus II", code: "MA202", credits: 4, letterGrade: "B+" }
    ]
  }
], null, 2)

export function SeedStudentsForm() {
  return (
    <SeedForm
      action={seedStudents}
      sampleJson={SAMPLE}
      placeholder={`Paste an array of student objects, e.g.\n[{"firstName":"...","lastName":"...","studentId":"S2024001","email":"...","grade":"freshman","major":"...","enrollmentYear":2024}]`}
      submitLabel="Seed students"
      copyLabel="Copy template"
      copyHint="One entry with all fields; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
