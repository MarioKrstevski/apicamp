import { TableConfig } from "@/types/table"

// Book catalog with rich bibliographic metadata.
// Locale-aware: each locale admin seeds books appropriate for that language/culture.
const config: TableConfig = {
  name: "books",
  label: "Books",
  description:
    "Book catalog with rich metadata — titles, authors, genres, ratings, and descriptions",

  // Each locale exposes books relevant to its language and literary tradition
  locale: true,
  localeFields: ["title", "description", "genre"],

  // v1: quick lookup — title, author, genre
  // v2: reading details — adds year, pages, rating, description
  // v3: everything including isbn, language, tags, and cover image
  versions: {
    v1: ["title", "author", "genre"],
    v2: ["title", "author", "genre", "year", "pages", "rating", "description"],
    v3: [
      "title",
      "author",
      "genre",
      "year",
      "pages",
      "rating",
      "description",
      "isbn",
      "language",
      "tags",
      "coverUrl",
    ],
  },

  fields: {
    // Full book title
    title: {
      type: "string",
      required: true,
      maxLength: 300,
      searchable: true,
      translatable: true,
    },
    // Primary author (or "Various" for anthologies)
    author: {
      type: "string",
      required: true,
      maxLength: 200,
      searchable: true,
    },
    // ISBN-10 or ISBN-13 — optional, useful for real-world lookup practice
    isbn: {
      type: "string",
      required: false,
      maxLength: 17, // 13 digits + optional hyphens
    },
    // Broad genre classification
    genre: {
      type: "enum",
      required: true,
      values: [
        "fiction",
        "non-fiction",
        "sci-fi",
        "fantasy",
        "mystery",
        "biography",
        "history",
        "science",
        "romance",
        "thriller",
        "philosophy",
      ],
      translatable: true,
    },
    // Year of first publication
    year: {
      type: "integer",
      required: false,
      min: 1450, // Gutenberg press onward
      max: 2030,
    },
    // Total page count
    pages: {
      type: "integer",
      required: false,
      min: 1,
      max: 10000,
    },
    // Average reader rating out of 5
    rating: {
      type: "number",
      required: false,
      min: 0,
      max: 5,
      precision: 1,
      default: 0,
    },
    // Short synopsis or back-cover blurb
    description: {
      type: "text",
      required: false,
      maxLength: 3000,
      searchable: true,
      translatable: true,
    },
    // Original language of the book (ISO 639-1 code or plain name)
    language: {
      type: "string",
      required: false,
      maxLength: 50,
    },
    // Freeform thematic tags, e.g. ["dystopia", "coming-of-age", "classic"]
    tags: {
      type: "array",
      itemType: "string",
      required: false,
      maxItems: 10,
    },
    // URL to a cover image — useful for UI rendering practice
    coverUrl: {
      type: "url",
      required: false,
    },
    createdAt: {
      type: "datetime",
      required: false,
      auto: true,
    },
  },

  searchable: ["title", "author", "description"],
  sortable: ["title", "author", "year", "rating", "pages", "createdAt"],
  filterable: ["genre", "language"],

  maxUserRows: 100,
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],
  seedCount: 15,

  docs: {
    examples: [
      {
        title: "List all books (v1 — minimal)",
        method: "GET",
        url: "/api/en/v1/books",
        response: {
          data: [
            {
              id: "c3d4e5f6-...",
              title: "1984",
              author: "George Orwell",
              genre: "fiction",
            },
          ],
        },
      },
      {
        title: "List books with reading details (v2)",
        method: "GET",
        url: "/api/en/v2/books",
        response: {
          data: [
            {
              id: "c3d4e5f6-...",
              title: "1984",
              author: "George Orwell",
              genre: "fiction",
              year: 1949,
              pages: 328,
              rating: 4.7,
              description:
                "A dystopian social science fiction novel and cautionary tale.",
            },
          ],
        },
      },
      {
        title: "Full metadata including ISBN, language, tags, and cover (v3)",
        method: "GET",
        url: "/api/en/v3/books",
        response: {
          data: [
            {
              id: "c3d4e5f6-...",
              title: "1984",
              author: "George Orwell",
              genre: "fiction",
              year: 1949,
              pages: 328,
              rating: 4.7,
              description:
                "A dystopian social science fiction novel and cautionary tale.",
              isbn: "978-0451524935",
              language: "English",
              tags: ["dystopia", "totalitarianism", "classic"],
              coverUrl: "https://example.com/covers/1984.jpg",
            },
          ],
        },
      },
      {
        title: "Filter by genre",
        method: "GET",
        url: "/api/en/v2/books?genre=philosophy",
      },
      {
        title: "Filter by language",
        method: "GET",
        url: "/api/en/v3/books?language=French",
      },
      {
        title: "Search by title or author",
        method: "GET",
        url: "/api/en/v2/books?search=tolkien",
      },
      {
        title: "Sort by rating descending",
        method: "GET",
        url: "/api/en/v2/books?sort=rating&order=desc",
      },
      {
        title: "French locale — French-language books",
        method: "GET",
        url: "/api/fr/v2/books",
      },
      {
        title: "Create a book (requires API key, paid tier)",
        method: "POST",
        url: "/api/en/v3/books",
        headers: { "x-api-key": "your-api-key" },
        body: {
          title: "The Pragmatic Programmer",
          author: "David Thomas, Andrew Hunt",
          genre: "non-fiction",
          year: 1999,
          pages: 352,
          rating: 4.8,
          description:
            "A guide to becoming a better programmer through pragmatic thinking.",
          isbn: "978-0135957059",
          language: "English",
          tags: ["programming", "career", "best-practices"],
        },
      },
      {
        title: "Update a book (requires API key, paid tier)",
        method: "PUT",
        url: "/api/en/v3/books/c3d4e5f6-...",
        headers: { "x-api-key": "your-api-key" },
        body: {
          rating: 4.9,
        },
      },
      {
        title: "Delete a book (requires API key, paid tier)",
        method: "DELETE",
        url: "/api/en/v3/books/c3d4e5f6-...",
        headers: { "x-api-key": "your-api-key" },
      },
    ],
  },
}

export default config
