import { TableConfig } from "@/types/table"

const config: TableConfig = {
  name: "products",
  label: "Products",
  description: "E-commerce products with pricing, inventory, and metadata",

  locale: true,
  localeFields: ["name", "description", "category"],

  versions: {
    v1: ["id", "name", "price", "category"],
    v2: ["id", "name", "price", "category", "stock", "rating", "tags"],
    v3: ["id", "name", "price", "category", "stock", "rating", "tags", "description", "images", "meta"]
  },

  fields: {
    name: {
      type: "string",
      required: true,
      maxLength: 120,
      searchable: true,
      translatable: true
    },
    description: {
      type: "text",
      required: false,
      maxLength: 2000,
      searchable: true,
      translatable: true
    },
    price: {
      type: "number",
      required: true,
      min: 0,
      max: 99999,
      precision: 2
    },
    stock: {
      type: "integer",
      required: false,
      min: 0,
      max: 100000,
      default: 0
    },
    inStock: {
      type: "boolean",
      required: false,
      default: true
    },
    category: {
      type: "enum",
      required: true,
      values: ["electronics", "clothing", "food", "books", "sports"],
      translatable: true
    },
    tags: {
      type: "enum_multi",
      required: false,
      values: ["sale", "new", "featured", "limited", "bestseller"],
      maxItems: 5
    },
    rating: {
      type: "number",
      required: false,
      min: 0,
      max: 5,
      precision: 1,
      default: 0
    },
    images: {
      type: "array",
      itemType: "url",
      required: false,
      maxItems: 10
    },
    releaseDate: {
      type: "date",
      required: false
    },
    createdAt: {
      type: "datetime",
      required: false,
      auto: true
    },
    externalUrl: {
      type: "url",
      required: false
    },
    supplierEmail: {
      type: "email",
      required: false
    },
    meta: {
      type: "json",
      required: false,
      description: "Freeform metadata — dimensions, weight, color codes etc."
    },
    brandId: {
      type: "ref",
      required: false,
      ref: "brands",
      description: "Brand this product belongs to"
    }
  },

  searchable: ["name", "description", "category"],
  sortable: ["name", "price", "rating", "createdAt", "stock"],
  filterable: ["category", "inStock", "tags", "rating"],
  maxUserRows: 100,
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],
  seedCount: 20,
}

export default config
