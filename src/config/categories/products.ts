// config/categories/products.ts
// Semi-complex example showing all possible field types and options

import { CategoryConfig } from "@/types/category"

const config: CategoryConfig = {
  // --- Identity ---
  name: "products",           // used in URL: /api/en/v1/products
  label: "Products",          // used in UI and docs
  description: "E-commerce products with pricing, inventory, and metadata",

  // --- Locale support ---
  locale: true,               // enables /api/fr/v1/products etc.
  localeFields: ["name", "description", "category"],  // only these fields get translated

  // --- Versioning ---
  versions: {
    v1: ["id", "name", "price", "category"],
    v2: ["id", "name", "price", "category", "stock", "rating", "tags"],
    v3: ["id", "name", "price", "category", "stock", "rating", "tags", "description", "images", "meta"]
  },

  // --- Fields (all possible types) ---
  fields: {
    // string — plain text
    name: {
      type: "string",
      required: true,
      maxLength: 120,
      searchable: true,
      translatable: true
    },

    // text — long form text
    description: {
      type: "text",
      required: false,
      maxLength: 2000,
      searchable: true,
      translatable: true
    },

    // number — integer or float
    price: {
      type: "number",
      required: true,
      min: 0,
      max: 99999,
      precision: 2       // decimal places
    },

    // integer — whole numbers only
    stock: {
      type: "integer",
      required: false,
      min: 0,
      max: 100000,
      default: 0
    },

    // boolean
    inStock: {
      type: "boolean",
      required: false,
      default: true
    },

    // enum — fixed set of values
    category: {
      type: "enum",
      required: true,
      values: ["electronics", "clothing", "food", "books", "sports"],
      translatable: true
    },

    // enum with multiple allowed (acts like tags)
    tags: {
      type: "enum_multi",
      required: false,
      values: ["sale", "new", "featured", "limited", "bestseller"],
      maxItems: 5
    },

    // number with constraints — rating
    rating: {
      type: "number",
      required: false,
      min: 0,
      max: 5,
      precision: 1,
      default: 0
    },

    // array of strings
    images: {
      type: "array",
      itemType: "url",
      required: false,
      maxItems: 10
    },

    // date
    releaseDate: {
      type: "date",
      required: false
    },

    // datetime
    createdAt: {
      type: "datetime",
      required: false,
      auto: true          // auto-set on insert, user cannot set this
    },

    // url
    externalUrl: {
      type: "url",
      required: false
    },

    // email
    supplierEmail: {
      type: "email",
      required: false
    },

    // json — freeform nested object
    meta: {
      type: "json",
      required: false,
      description: "Freeform metadata — dimensions, weight, color codes etc."
    },

    // reference to another category (relation)
    brandId: {
      type: "ref",
      required: false,
      ref: "brands",      // links to /api/brands/:id
      description: "Brand this product belongs to"
    }
  },

  // --- Query options ---
  searchable: ["name", "description", "category"],
  sortable: ["name", "price", "rating", "createdAt", "stock"],
  filterable: ["category", "inStock", "tags", "rating"],

  // --- Limits ---
  maxUserRows: 100,

  // --- Behavior modifiers supported ---
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],

  // --- Seed data hint (used by Claude Code skill) ---
  seedCount: 20,           // how many system rows to generate per locale
}

export default config
