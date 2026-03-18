import { TableConfig } from "@/types/table"

// Famous quotes from authors, philosophers, scientists, and artists.
// Locale-aware: each locale admin seeds quotes appropriate for that language/culture.
const config: TableConfig = {
  name: "quotes",
  label: "Quotes",
  description:
    "Famous quotes from authors, philosophers, scientists, and artists across history",

  // Each locale has its own set of culturally relevant quotes
  locale: true,
  localeFields: ["text", "source", "category"],

  // v1: the bare minimum — quote text, who said it, what kind of quote it is
  // v2: full metadata including where it came from, when, and searchable tags
  versions: {
    v1: ["text", "author", "category"],
    v2: ["text", "author", "category", "source", "year", "tags"],
  },

  fields: {
    // The quote itself — required, searchable, locale-specific
    text: {
      type: "text",
      required: true,
      maxLength: 1000,
      searchable: true,
      translatable: true,
    },
    // Person (or entity) credited with the quote
    author: {
      type: "string",
      required: true,
      maxLength: 120,
      searchable: true,
    },
    // Optional origin — book title, speech name, film, interview, etc.
    source: {
      type: "string",
      required: false,
      maxLength: 200,
      translatable: true,
    },
    // Broad thematic category for filtering
    category: {
      type: "enum",
      required: true,
      values: [
        "motivation",
        "philosophy",
        "humor",
        "love",
        "wisdom",
        "science",
        "history",
      ],
    },
    // Year the quote was said or published (CE). Negative values for BCE.
    year: {
      type: "integer",
      required: false,
      min: -600,
      max: 2030,
    },
    // Freeform tags for cross-cutting themes, e.g. ["courage", "stoicism"]
    tags: {
      type: "array",
      itemType: "string",
      required: false,
      maxItems: 8,
    },
    createdAt: {
      type: "datetime",
      required: false,
      auto: true,
    },
  },

  searchable: ["text", "author"],
  sortable: ["author", "year", "createdAt"],
  filterable: ["category"],

  maxUserRows: 50,
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],
  seedCount: 12,

  docs: {
    examples: [
      {
        title: "List all quotes (v1)",
        method: "GET",
        url: "/api/en/v1/quotes",
        response: {
          data: [
            {
              id: "a1b2c3d4-...",
              text: "The only way to do great work is to love what you do.",
              author: "Steve Jobs",
              category: "motivation",
            },
          ],
        },
      },
      {
        title: "List quotes with full metadata (v2)",
        method: "GET",
        url: "/api/en/v2/quotes",
        response: {
          data: [
            {
              id: "a1b2c3d4-...",
              text: "The only way to do great work is to love what you do.",
              author: "Steve Jobs",
              category: "motivation",
              source: "Stanford Commencement Address",
              year: 2005,
              tags: ["work", "passion"],
            },
          ],
        },
      },
      {
        title: "Filter by category",
        method: "GET",
        url: "/api/en/v2/quotes?category=philosophy",
      },
      {
        title: "Search by author",
        method: "GET",
        url: "/api/en/v2/quotes?search=einstein",
      },
      {
        title: "French locale quotes",
        method: "GET",
        url: "/api/fr/v2/quotes",
      },
      {
        title: "Create a quote (requires API key, paid tier)",
        method: "POST",
        url: "/api/en/v2/quotes",
        headers: { "x-api-key": "your-api-key" },
        body: {
          text: "An investment in knowledge pays the best interest.",
          author: "Benjamin Franklin",
          category: "wisdom",
          source: "Poor Richard's Almanack",
          year: 1758,
          tags: ["knowledge", "investment"],
        },
      },
    ],
  },
}

export default config
