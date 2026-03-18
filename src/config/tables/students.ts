import { TableConfig } from "@/types/table";

/**
 * students — University/college student directory.
 *
 * Locale-aware: student names, majors, and enrollment data reflect the
 * language/region of the requested locale (e.g. French students under /fr/).
 *
 * Versions
 * ─────────
 * v1  minimal identity  — firstName, lastName, studentId, major
 * v2  academic profile  — adds grade, gpa, email, enrollmentYear, isActive
 * v3  full record       — adds subjects, minor, age
 *
 * Note: `id` is always injected by the route handler; never list it here.
 */
const config: TableConfig = {
  // ─── Identity ──────────────────────────────────────────────────────────────
  name: "students",
  label: "Students",
  description:
    "University and college student profiles with academic records, GPA, enrolled subjects, and enrollment metadata.",
  icon: "🎓",

  // ─── Features ──────────────────────────────────────────────────────────────
  locale: true,         // supports /api/fr/v1/students, /api/es/v1/students, …
  versioning: true,
  allowUserRows: true,  // paid users can add their own student rows
  fileUpload: false,
  maxUserRows: 100,
  seedCount: 10,

  // ─── Versions ──────────────────────────────────────────────────────────────
  // id is injected automatically — do NOT list it here
  versions: {
    v1: ["firstName", "lastName", "studentId", "major"],
    v2: ["firstName", "lastName", "studentId", "major", "grade", "gpa", "email", "enrollmentYear", "isActive"],
    v3: ["firstName", "lastName", "studentId", "major", "grade", "gpa", "email", "enrollmentYear", "isActive", "subjects", "minor", "age"],
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
    // Institution-assigned identifier, e.g. "S2024001"
    studentId: {
      type: "string",
      required: true,
      unique: true,
      pattern: "^S\\d{7}$",
      example: "S2024001",
      searchable: true,
    },
    email: {
      type: "email",
      required: true,
      unique: true,
      searchable: true,
    },
    age: {
      type: "number",
      required: false,
      min: 16,
      max: 40,
    },
    grade: {
      type: "enum",
      required: true,
      default: "freshman",
      values: ["freshman", "sophomore", "junior", "senior", "graduate", "phd"],
    },
    // GPA on a 0.0–4.0 scale; optional since not all programs use GPA
    gpa: {
      type: "number",
      required: false,
      min: 0.0,
      max: 4.0,
      precision: 2,
    },
    major: {
      type: "string",
      required: true,
      maxLength: 100,
      localizable: true,
      searchable: true,
      example: "Computer Science",
    },
    minor: {
      type: "string",
      required: false,
      maxLength: 100,
      localizable: true,
      example: "Mathematics",
    },
    // Array of enrolled or completed courses
    subjects: {
      type: "array",
      required: false,
      items: {
        type: "object",
        shape: {
          name:        { type: "string",  required: true,  example: "Algorithms" },
          code:        { type: "string",  required: true,  example: "CS301" },
          credits:     { type: "number",  required: true,  min: 1, max: 6 },
          letterGrade: {
            type: "enum",
            required: false,
            values: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F", "W", "P"],
          },
        },
      },
      maxItems: 20,
    },
    enrollmentYear: {
      type: "number",
      required: true,
      min: 2000,
      max: 2030,
      example: 2022,
    },
    isActive: {
      type: "boolean",
      required: false,
      default: true,
    },
    createdAt: {
      type: "timestamp",
      required: false,
      auto: true,
    },
  },

  // ─── Query / Filtering ─────────────────────────────────────────────────────
  searchable: ["firstName", "lastName", "studentId", "email", "major"],
  filterable: ["grade", "major", "isActive"],
  sortable: ["lastName", "gpa", "enrollmentYear"],

  queryParams: {
    search:  { fields: ["firstName", "lastName", "studentId", "email", "major"] },
    sort:    { fields: ["lastName", "gpa", "enrollmentYear"], default: "lastName" },
    order:   { values: ["asc", "desc"], default: "asc" },
    filter:  { fields: ["grade", "major", "isActive"] },
    page:    { default: 1 },
    limit:   { default: 10, max: 100 },
  },

  // ─── Docs ──────────────────────────────────────────────────────────────────
  docs: {
    examples: {
      get: {
        description: "Fetch a paginated list of students sorted by last name",
        url: "/api/en/v2/students?page=1&limit=10&sort=lastName&order=asc",
      },
      getFiltered: {
        description: "Fetch only active senior students majoring in Computer Science",
        url: "/api/en/v2/students?filter[grade]=senior&filter[major]=Computer Science&filter[isActive]=true",
      },
      getById: {
        description: "Fetch a single student record by ID",
        url: "/api/en/v3/students/abc-uuid-here",
      },
      post: {
        description: "Enroll a new student (requires paid tier)",
        body: {
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
            { name: "Calculus II",     code: "MA202", credits: 4, letterGrade: "B+" },
          ],
        },
      },
      put: {
        description: "Update a student's GPA and active status",
        body: { gpa: 3.82, isActive: true },
      },
      delete: {
        description: "Remove a student row you created",
        url: "/api/en/v2/students/abc-uuid-here",
      },
    },
  },
};

export default config;
