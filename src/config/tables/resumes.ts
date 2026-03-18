import { TableConfig } from "@/types/table";

/**
 * resumes — Directory of IT/tech professionals.
 *
 * Each row represents a tech professional's public CV: their title, skills,
 * tech stack, certifications, and hire availability.  Locale-aware so that
 * seeded professionals reflect the language/region of the requested locale.
 *
 * Versions
 * ─────────
 * v1  identity card    — firstName, lastName, title, seniorityLevel
 * v2  skills snapshot  — adds skills, yearsOfExperience, techStack,
 *                        availableForHire, location
 * v3  full CV          — adds certifications, education, summary,
 *                        programmingLanguages, github, linkedin
 *
 * Note: `id` is always injected by the route handler; never list it here.
 */
const config: TableConfig = {
  // ─── Identity ──────────────────────────────────────────────────────────────
  name: "resumes",
  label: "Resumes",
  description:
    "IT and tech professional CVs with skills, tech stack, certifications, education, and hire availability.",
  icon: "💼",

  // ─── Features ──────────────────────────────────────────────────────────────
  locale: true,         // supports /api/fr/v1/resumes — French tech professionals
  versioning: true,
  allowUserRows: true,  // paid users can add their own resume row
  fileUpload: false,
  maxUserRows: 50,
  seedCount: 8,

  // ─── Versions ──────────────────────────────────────────────────────────────
  // id is injected automatically — do NOT list it here
  versions: {
    v1: ["firstName", "lastName", "title", "seniorityLevel"],
    v2: ["firstName", "lastName", "title", "seniorityLevel", "skills", "yearsOfExperience", "techStack", "availableForHire", "location"],
    v3: ["firstName", "lastName", "title", "seniorityLevel", "skills", "yearsOfExperience", "techStack", "availableForHire", "location", "certifications", "education", "summary", "programmingLanguages", "github", "linkedin"],
  },

  // ─── Field Definitions ─────────────────────────────────────────────────────
  fields: {
    firstName: {
      type: "string",
      required: true,
      maxLength: 50,
      localizable: true,
      searchable: true,
    },
    lastName: {
      type: "string",
      required: true,
      maxLength: 50,
      localizable: true,
      searchable: true,
    },
    // Current or most recent job title
    title: {
      type: "string",
      required: true,
      maxLength: 100,
      searchable: true,
      example: "Senior Backend Engineer",
    },
    // 2–3 sentence professional bio
    summary: {
      type: "text",
      required: false,
      maxLength: 600,
      example: "Full-stack engineer with 8 years of experience building distributed systems at scale. Passionate about developer tooling and open-source contributions.",
    },
    yearsOfExperience: {
      type: "number",
      required: true,
      min: 0,
      max: 40,
    },
    seniorityLevel: {
      type: "enum",
      required: true,
      values: ["junior", "mid", "senior", "lead", "principal", "cto"],
    },
    // Broad set of technologies the professional knows
    skills: {
      type: "array",
      required: false,
      items: { type: "string", maxLength: 50 },
      maxItems: 30,
      example: ["React", "Node.js", "PostgreSQL", "Docker", "Kubernetes"],
    },
    // Subset of skills used in their day-to-day work
    techStack: {
      type: "array",
      required: false,
      items: { type: "string", maxLength: 50 },
      maxItems: 10,
      example: ["TypeScript", "Next.js", "Supabase", "Tailwind CSS"],
    },
    programmingLanguages: {
      type: "array",
      required: false,
      items: { type: "string", maxLength: 30 },
      maxItems: 15,
      example: ["TypeScript", "Python", "Go", "Rust"],
    },
    // Professional certifications (AWS, GCP, CKA, etc.)
    certifications: {
      type: "array",
      required: false,
      items: {
        type: "object",
        shape: {
          name:   { type: "string",  required: true,  example: "AWS Solutions Architect – Associate" },
          issuer: { type: "string",  required: true,  example: "Amazon Web Services" },
          year:   { type: "number",  required: true,  min: 1990, max: 2030 },
        },
      },
      maxItems: 10,
    },
    // Academic background
    education: {
      type: "array",
      required: false,
      items: {
        type: "object",
        shape: {
          degree:      { type: "string",  required: true,  example: "Bachelor of Science" },
          field:       { type: "string",  required: true,  example: "Computer Science" },
          institution: { type: "string",  required: true,  example: "MIT" },
          year:        { type: "number",  required: false, min: 1970, max: 2030 },
        },
      },
      maxItems: 5,
    },
    github: {
      type: "url",
      required: false,
      pattern: "^https://github\\.com/",
      example: "https://github.com/octocat",
    },
    linkedin: {
      type: "url",
      required: false,
      pattern: "^https://www\\.linkedin\\.com/in/",
      example: "https://www.linkedin.com/in/johndoe",
    },
    availableForHire: {
      type: "boolean",
      required: false,
      default: false,
    },
    // Free-text city/country — intentionally loose for an API playground
    location: {
      type: "string",
      required: false,
      maxLength: 100,
      localizable: true,
      example: "Berlin, Germany",
    },
    createdAt: {
      type: "timestamp",
      required: false,
      auto: true,
    },
  },

  // ─── Query / Filtering ─────────────────────────────────────────────────────
  searchable: ["firstName", "lastName", "title"],
  filterable: ["seniorityLevel", "availableForHire"],
  sortable: ["lastName", "yearsOfExperience"],

  queryParams: {
    search:  { fields: ["firstName", "lastName", "title"] },
    sort:    { fields: ["lastName", "yearsOfExperience"], default: "lastName" },
    order:   { values: ["asc", "desc"], default: "asc" },
    filter:  { fields: ["seniorityLevel", "availableForHire"] },
    page:    { default: 1 },
    limit:   { default: 10, max: 100 },
  },

  // ─── Docs ──────────────────────────────────────────────────────────────────
  docs: {
    examples: {
      get: {
        description: "Fetch a paginated list of tech professionals sorted by last name",
        url: "/api/en/v2/resumes?page=1&limit=10&sort=lastName&order=asc",
      },
      getFiltered: {
        description: "Find senior engineers who are open to new opportunities",
        url: "/api/en/v2/resumes?filter[seniorityLevel]=senior&filter[availableForHire]=true",
      },
      getById: {
        description: "Fetch a full CV by ID (v3 includes certifications and education)",
        url: "/api/en/v3/resumes/abc-uuid-here",
      },
      post: {
        description: "Submit a new tech professional resume (requires paid tier)",
        body: {
          firstName: "Sofia",
          lastName: "Vasquez",
          email: "sofia.vasquez@example.com",
          title: "DevOps Lead",
          summary: "Infrastructure engineer with 10 years experience designing CI/CD pipelines and Kubernetes clusters at scale. Strong advocate for GitOps and platform engineering.",
          yearsOfExperience: 10,
          seniorityLevel: "lead",
          skills: ["Kubernetes", "Terraform", "AWS", "Helm", "Prometheus", "ArgoCD"],
          techStack: ["Kubernetes", "Terraform", "AWS"],
          programmingLanguages: ["Python", "Bash", "Go"],
          certifications: [
            { name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", year: 2022 },
            { name: "AWS Solutions Architect – Professional",   issuer: "Amazon Web Services", year: 2021 },
          ],
          education: [
            { degree: "Master of Science", field: "Computer Engineering", institution: "Universidad Politécnica de Madrid", year: 2014 },
          ],
          github: "https://github.com/sofiavasquez",
          linkedin: "https://www.linkedin.com/in/sofiavasquez",
          availableForHire: true,
          location: "Madrid, Spain",
        },
      },
      put: {
        description: "Update hire availability and add a new skill",
        body: { availableForHire: false, skills: ["Kubernetes", "Terraform", "AWS", "Helm", "Cilium"] },
      },
      delete: {
        description: "Remove a resume row you created",
        url: "/api/en/v2/resumes/abc-uuid-here",
      },
    },
  },
};

export default config;
