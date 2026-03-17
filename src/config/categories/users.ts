import { CategoryConfig } from "@/types/category";

const config: CategoryConfig = {
  // ─── Identity ────────────────────────────────────────────────────────────────
  name: "users",
  label: "Users",
  description: "User profiles with contact info, preferences, and metadata.",
  icon: "👤",

  // ─── Features ────────────────────────────────────────────────────────────────
  locale: true,          // supports /api/fr/v1/users
  versioning: true,      // supports /api/en/v1/users and /api/en/v2/users
  searchable: true,
  allowUserRows: true,   // paid users can add their own rows
  fileUpload: false,     // no file upload on this category

  // ─── Versions ────────────────────────────────────────────────────────────────
  // Each version defines which fields are exposed in the response.
  // Later versions are supersets — fields are never removed, only added or reshaped.
  versions: {
    v1: ["id", "name", "email"],
    v2: ["id", "firstName", "lastName", "email", "age", "avatar"],
    v3: ["id", "firstName", "lastName", "email", "age", "avatar", "address", "phone", "role", "isActive", "createdAt"],
  },

  // ─── Field Definitions ───────────────────────────────────────────────────────
  // All possible field types are demonstrated here.
  fields: {
    // string — plain text
    name: {
      type: "string",
      required: true,
      maxLength: 100,
      localizable: true,        // has name_fr, name_es variants
      searchable: true,
    },

    // string — with validation pattern
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

    // email — validated format
    email: {
      type: "email",
      required: true,
      unique: true,
      searchable: true,
    },

    // number — integer
    age: {
      type: "number",
      required: false,
      min: 1,
      max: 120,
    },

    // url — validated format
    avatar: {
      type: "url",
      required: false,
    },

    // phone — validated format
    phone: {
      type: "phone",
      required: false,
    },

    // boolean
    isActive: {
      type: "boolean",
      required: false,
      default: true,
    },

    // enum — fixed set of values
    role: {
      type: "enum",
      required: false,
      default: "user",
      values: ["admin", "user", "moderator", "guest"],
    },

    // object — nested structure
    address: {
      type: "object",
      required: false,
      shape: {
        street: { type: "string", required: false },
        number: { type: "string", required: false },
        city:   { type: "string", required: false, localizable: true },
        zip:    { type: "string", required: false },
        country:{ type: "string", required: false, localizable: true },
      },
    },

    // array of strings
    tags: {
      type: "array",
      required: false,
      items: { type: "string" },
      maxItems: 10,
    },

    // array of objects
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

    // date — ISO string, validated and parsed
    birthDate: {
      type: "date",
      required: false,
    },

    // timestamp — auto-managed, not user-settable
    createdAt: {
      type: "timestamp",
      required: false,
      auto: true,       // set automatically on insert, never from user input
    },

    // uuid — auto-generated, never user-settable
    id: {
      type: "uuid",
      required: false,
      auto: true,
    },
  },

  // ─── Query / Filtering ───────────────────────────────────────────────────────
  // Defines which query params are allowed on GET /users
  queryParams: {
    search:   { fields: ["name", "firstName", "lastName", "email"] },
    sort:     { fields: ["name", "age", "createdAt"], default: "createdAt" },
    order:    { values: ["asc", "desc"], default: "desc" },
    filter:   { fields: ["role", "isActive", "age"] },
    page:     { default: 1 },
    limit:    { default: 10, max: 100 },
  },

  // ─── Docs ────────────────────────────────────────────────────────────────────
  // Used to auto-generate the docs page for this category
  docs: {
    examples: {
      get: {
        description: "Fetch a paginated list of users",
        url: "/api/en/v2/users?page=1&limit=5&sort=age&order=asc",
      },
      getById: {
        description: "Fetch a single user by ID",
        url: "/api/en/v2/users/abc123",
      },
      post: {
        description: "Create a new user",
        body: {
          firstName: "Marie",
          lastName: "Dupont",
          email: "marie@example.com",
          age: 28,
          role: "user",
        },
      },
      put: {
        description: "Update a user",
        body: { age: 29, isActive: false },
      },
      delete: {
        description: "Delete a user you created",
        url: "/api/en/v2/users/abc123",
      },
    },
  },
};

export default config;
