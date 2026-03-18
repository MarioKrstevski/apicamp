import { TableConfig } from "@/types/table"

// Wildlife / animal catalog — a read-friendly dataset great for learning
// filtering, sorting, and pagination.
//
// locale: true — each locale admin seeds regionally relevant animals.
// Scientific names, numbers, and taxonomy are universal values.
const config: TableConfig = {
  name: "animals",
  label: "Animals",
  description:
    "A wildlife catalog spanning mammals, birds, reptiles, and more — " +
    "with conservation status, habitat, diet, and fun facts",

  // Locale-aware — each locale admin seeds regionally relevant animals.
  // Scientific names, numbers, and taxonomy are shared values that work across locales.
  locale: true,

  // v1: the bare minimum needed to identify and classify an animal
  // v2: rich metadata — conservation, lifespan, nocturnal behaviour, fun fact
  // id is injected automatically by the route handler — do NOT list it here
  versions: {
    v1: ["name", "type", "habitat", "diet"],
    v2: [
      "name",
      "type",
      "habitat",
      "diet",
      "conservationStatus",
      "scientificName",
      "lifespanYears",
      "isNocturnal",
      "funFact",
      "nativeRegion",
    ],
  },

  fields: {
    // Common name — the human-readable label shown in every version
    name: {
      type: "string",
      required: true,
      maxLength: 120,
      searchable: true,
      example: "African Elephant",
    },

    // Binomial nomenclature — useful for teaching API consumers about optional fields
    scientificName: {
      type: "string",
      required: false,
      maxLength: 120,
      searchable: true,
      example: "Loxodonta africana",
    },

    // Broad taxonomic type — drives the primary classification filter
    type: {
      type: "enum",
      required: true,
      values: [
        "mammal",
        "bird",
        "reptile",
        "fish",
        "amphibian",
        "insect",
        "arachnid",
        "cephalopod",
      ],
    },

    // Primary ecosystem the animal inhabits
    habitat: {
      type: "enum",
      required: true,
      values: [
        "forest",
        "ocean",
        "desert",
        "grassland",
        "arctic",
        "freshwater",
        "urban",
        "mountain",
        "wetland",
        "savanna",
      ],
    },

    // Feeding strategy — good filterable dimension for biology learners
    diet: {
      type: "enum",
      required: true,
      values: [
        "herbivore",
        "carnivore",
        "omnivore",
        "insectivore",
        "piscivore",
      ],
    },

    // IUCN Red List codes — teaches enum filtering with real-world significance
    // LC=Least Concern, NT=Near Threatened, VU=Vulnerable, EN=Endangered,
    // CR=Critically Endangered, EW=Extinct in the Wild, EX=Extinct
    conservationStatus: {
      type: "enum",
      required: false,
      values: ["LC", "NT", "VU", "EN", "CR", "EW", "EX"],
    },

    // Average adult weight in kilograms — good for numeric sort demos
    weightKg: {
      type: "number",
      required: false,
      min: 0,
      precision: 2,
      example: 4000,
    },

    // Average lifespan in years — sortable numeric field
    lifespanYears: {
      type: "number",
      required: false,
      min: 0,
      precision: 1,
      example: 70,
    },

    // One punchy, memorable fact — great for search demos
    funFact: {
      type: "text",
      required: false,
      maxLength: 400,
      searchable: true,
      example:
        "African elephants can recognise themselves in a mirror, one of very few non-human species with this ability.",
    },

    // Continent or broad geographic region — searchable string, not an enum
    // so learners can see partial-match search in action
    nativeRegion: {
      type: "string",
      required: false,
      maxLength: 120,
      searchable: true,
      example: "Sub-Saharan Africa",
    },

    // Simple boolean — good for teaching boolean filter params
    isNocturnal: {
      type: "boolean",
      required: false,
    },

    // Max recorded speed in km/h — another numeric sort / filter field
    speed: {
      type: "number",
      required: false,
      min: 0,
      max: 500,
      precision: 1,
      example: 40,
    },

    // Freeform string tags — e.g. ["endangered", "apex predator", "social"]
    tags: {
      type: "array",
      itemType: "string",
      required: false,
      maxItems: 8,
    },

    // Auto-set on insert — teaches learners about read-only timestamp fields
    createdAt: {
      type: "datetime",
      required: false,
      auto: true,
    },
  },

  searchable: ["name", "scientificName", "nativeRegion", "funFact"],
  sortable: ["name", "type", "lifespanYears", "weightKg"],
  filterable: ["type", "habitat", "diet", "conservationStatus"],

  // Modest user-row cap — catalog tables don't need large personal collections
  maxUserRows: 50,
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],
  seedCount: 20,

  docs: {
    examples: [
      {
        title: "List all animals (v1 — name, type, habitat, diet)",
        method: "GET",
        url: "/api/en/v1/animals",
        response: {
          data: [
            {
              id: "c3d4e5f6-...",
              name: "African Elephant",
              type: "mammal",
              habitat: "savanna",
              diet: "herbivore",
            },
            {
              id: "d4e5f6a7-...",
              name: "Great White Shark",
              type: "fish",
              habitat: "ocean",
              diet: "carnivore",
            },
          ],
        },
      },
      {
        title: "Full metadata (v2)",
        method: "GET",
        url: "/api/en/v2/animals",
        response: {
          data: [
            {
              id: "c3d4e5f6-...",
              name: "African Elephant",
              type: "mammal",
              habitat: "savanna",
              diet: "herbivore",
              conservationStatus: "VU",
              scientificName: "Loxodonta africana",
              lifespanYears: 70,
              isNocturnal: false,
              funFact:
                "African elephants can recognise themselves in a mirror.",
              nativeRegion: "Sub-Saharan Africa",
            },
          ],
        },
      },
      {
        title: "Filter by type",
        method: "GET",
        url: "/api/en/v2/animals?type=bird",
      },
      {
        title: "Filter by conservation status",
        method: "GET",
        url: "/api/en/v2/animals?conservationStatus=CR",
      },
      {
        title: "Filter by habitat and diet",
        method: "GET",
        url: "/api/en/v2/animals?habitat=ocean&diet=carnivore",
      },
      {
        title: "Search by name or region",
        method: "GET",
        url: "/api/en/v2/animals?search=africa",
      },
      {
        title: "Sort by lifespan (descending)",
        method: "GET",
        url: "/api/en/v2/animals?sort=lifespanYears&order=desc",
      },
      {
        title: "Add a custom animal (requires API key, paid tier)",
        method: "POST",
        url: "/api/en/v2/animals",
        headers: { "x-api-key": "your-api-key" },
        body: {
          name: "Axolotl",
          scientificName: "Ambystoma mexicanum",
          type: "amphibian",
          habitat: "freshwater",
          diet: "carnivore",
          conservationStatus: "CR",
          lifespanYears: 15,
          isNocturnal: true,
          funFact:
            "The axolotl can regenerate entire limbs, parts of the brain, and even sections of the heart.",
          nativeRegion: "Mexico",
          tags: ["neotenic", "endangered", "regeneration"],
        },
      },
    ],
  },
}

export default config
