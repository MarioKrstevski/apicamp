import { TableConfig } from "@/types/category";

const config: TableConfig = {
  // ─── Identity ────────────────────────────────────────────────────────────────
  name: "users",
  label: "Users",
  description: "User profiles with contact info, preferences, and metadata.",
  icon: "👤",

  // The users table uses "created_by" instead of "user_id" to avoid ambiguity
  // (the row IS a user, so "user_id" would be confusing).
  ownershipCol: "created_by",

  // ─── Features ────────────────────────────────────────────────────────────────
  locale: true,          // supports /api/fr/v1/users
  versioning: true,      // supports /api/en/v1/users and /api/en/v2/users
  searchable: true,
  allowUserRows: true,   // paid users can add their own rows
  fileUpload: false,

  // ─── Versions ────────────────────────────────────────────────────────────────
  versions: {
    v1: ["id", "name", "email"],
    v2: ["id", "firstName", "lastName", "email", "age", "avatar"],
    v3: ["id", "firstName", "lastName", "email", "age", "avatar", "address", "phone", "role", "isActive", "createdAt"],
  },

  // ─── Field Definitions ───────────────────────────────────────────────────────
  fields: {
    name: {
      type: "string",
      required: true,
      maxLength: 100,
      localizable: true,
      searchable: true,
    },
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
    email: {
      type: "email",
      required: true,
      unique: true,
      searchable: true,
    },
    age: {
      type: "number",
      required: false,
      min: 1,
      max: 120,
    },
    avatar: {
      type: "url",
      required: false,
    },
    phone: {
      type: "phone",
      required: false,
    },
    isActive: {
      type: "boolean",
      required: false,
      default: true,
    },
    role: {
      type: "enum",
      required: false,
      default: "user",
      values: ["admin", "user", "moderator", "guest"],
    },
    address: {
      type: "object",
      required: false,
      shape: {
        street:  { type: "string", required: false },
        number:  { type: "string", required: false },
        city:    { type: "string", required: false, localizable: true },
        zip:     { type: "string", required: false },
        country: { type: "string", required: false, localizable: true },
      },
    },
    tags: {
      type: "array",
      required: false,
      items: { type: "string" },
      maxItems: 10,
    },
    socialLinks: {
      type: "array",
      required: false,
      items: {
        type: "object",
        shape: {
          platform: { type: "enum", values: ["twitter", "github", "linkedin"] },
          url:      { type: "url", required: true },
        },
      },
      maxItems: 5,
    },
    birthDate: {
      type: "date",
      required: false,
    },
    createdAt: {
      type: "timestamp",
      required: false,
      auto: true,
    },
    id: {
      type: "uuid",
      required: false,
      auto: true,
    },
  },

  // ─── Query / Filtering ───────────────────────────────────────────────────────
  sortable: ["name", "age", "createdAt"],
  filterable: ["role", "isActive", "age"],
  queryParams: {
    search:   { fields: ["name", "firstName", "lastName", "email"] },
    sort:     { fields: ["name", "age", "createdAt"], default: "createdAt" },
    order:    { values: ["asc", "desc"], default: "desc" },
    filter:   { fields: ["role", "isActive", "age"] },
    page:     { default: 1 },
    limit:    { default: 10, max: 100 },
  },

  // ─── Docs ────────────────────────────────────────────────────────────────────
  docs: {
    examples: {
      get:     { description: "Fetch a paginated list of users", url: "/api/en/v2/users?page=1&limit=5&sort=age&order=asc" },
      getById: { description: "Fetch a single user by ID",       url: "/api/en/v2/users/abc123" },
      post:    { description: "Create a new user",               body: { firstName: "Marie", lastName: "Dupont", email: "marie@example.com", age: 28, role: "user" } },
      put:     { description: "Update a user",                   body: { age: 29, isActive: false } },
      delete:  { description: "Delete a user you created",       url: "/api/en/v2/users/abc123" },
    },
  },
};

export default config;
