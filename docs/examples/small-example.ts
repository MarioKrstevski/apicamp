// SMALL EXAMPLE — easy to follow
// This handles GET /api/en/v1/cats and GET /api/fr/v2/users
// Same file handles ALL categories, ALL locales, ALL versions

import { NextRequest, NextResponse } from "next/server";

// ─── Fake DB (replace with Supabase calls) ────────────────────────────────────

const fakeRows: Record<string, object[]> = {
  cats: [
    { id: "1", name: "Whiskers", name_fr: "Moustache", breed: "Tabby",   age: 3  },
    { id: "2", name: "Luna",     name_fr: "Lune",       breed: "Siamese", age: 5  },
  ],
  dogs: [
    { id: "1", name: "Rex",    name_fr: "Rex",    breed: "Labrador", age: 2 },
    { id: "2", name: "Buddy",  name_fr: "Copain", breed: "Poodle",   age: 4 },
  ],
};

// ─── Version field maps ───────────────────────────────────────────────────────

const versions: Record<string, Record<string, string[]>> = {
  cats: {
    v1: ["id", "name"],
    v2: ["id", "name", "breed", "age"],
  },
  dogs: {
    v1: ["id", "name"],
    v2: ["id", "name", "breed", "age"],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Picks only the fields allowed for this version
function shapeRow(row: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(
    fields.map((f) => [f, row[f]])
  );
}

// Applies locale — tries name_fr first, falls back to name
function localizeRow(row: Record<string, unknown>, locale: string) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // skip locale variant keys like name_fr, name_es
    if (/_[a-z]{2}$/.test(key)) continue;
    // try localized version first, fall back to default
    result[key] = row[`${key}_${locale}`] ?? value;
  }
  return result;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { locale: string; version: string; category: string } }
) {
  const { locale, version, category } = params;

  // 1. does this category exist?
  const rows = fakeRows[category];
  if (!rows) {
    return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 404 });
  }

  // 2. does this version exist for this category?
  const fields = versions[category]?.[version];
  if (!fields) {
    return NextResponse.json({ error: `Unknown version: ${version}` }, { status: 404 });
  }

  // 3. localize + shape each row
  const result = rows
    .map((row) => localizeRow(row as Record<string, unknown>, locale))
    .map((row) => shapeRow(row, fields));

  return NextResponse.json({ data: result, count: result.length });
}
