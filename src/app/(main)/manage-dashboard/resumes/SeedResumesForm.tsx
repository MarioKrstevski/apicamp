'use client'

import { SeedForm } from '../SeedForm'
import { seedResumes } from './actions'

const SAMPLE = JSON.stringify([
  {
    firstName: "Sofia",
    lastName: "Vasquez",
    title: "DevOps Lead",
    summary: "Infrastructure engineer with 10 years experience designing CI/CD pipelines and Kubernetes clusters at scale.",
    yearsOfExperience: 10,
    seniorityLevel: "lead",
    skills: ["Kubernetes", "Terraform", "AWS", "Helm", "Prometheus"],
    techStack: ["Kubernetes", "Terraform", "AWS"],
    programmingLanguages: ["Python", "Bash", "Go"],
    certifications: [
      { name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", year: 2022 }
    ],
    education: [
      { degree: "Master of Science", field: "Computer Engineering", institution: "Universidad Politécnica de Madrid", year: 2014 }
    ],
    github: "https://github.com/sofiavasquez",
    linkedin: "https://www.linkedin.com/in/sofiavasquez",
    availableForHire: true,
    location: "Madrid, Spain"
  }
], null, 2)

export function SeedResumesForm() {
  return (
    <SeedForm
      action={seedResumes}
      sampleJson={SAMPLE}
      placeholder={`Paste an array of resume objects, e.g.\n[{"firstName":"...","lastName":"...","title":"...","yearsOfExperience":5,"seniorityLevel":"mid"}]`}
      submitLabel="Seed resumes"
      copyLabel="Copy template"
      copyHint="One entry with all fields; paste and edit."
      onSuccess={() => window.location.reload()}
    />
  )
}
