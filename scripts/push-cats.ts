import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key if available (bypasses RLS), otherwise fall back to publishable
const supabase = createClient(url, serviceKey || key);

const cats = [
  { id: 1,  name: "Whiskers",   breed: "Tabby",             age: 3  },
  { id: 2,  name: "Luna",       breed: "Siamese",           age: 5  },
  { id: 3,  name: "Shadow",     breed: "Black Cat",         age: 2  },
  { id: 4,  name: "Mochi",      breed: "Scottish Fold",     age: 4  },
  { id: 5,  name: "Simba",      breed: "Maine Coon",        age: 6  },
  { id: 6,  name: "Nala",       breed: "Ragdoll",           age: 1  },
  { id: 7,  name: "Oliver",     breed: "British Shorthair", age: 7  },
  { id: 8,  name: "Bella",      breed: "Persian",           age: 3  },
  { id: 9,  name: "Felix",      breed: "Tabby",             age: 9  },
  { id: 10, name: "Cleo",       breed: "Abyssinian",        age: 2  },
  { id: 11, name: "Tiger",      breed: "Bengal",            age: 4  },
  { id: 12, name: "Mittens",    breed: "Domestic Shorthair",age: 8  },
  { id: 13, name: "Coco",       breed: "Burmese",           age: 3  },
  { id: 14, name: "Ginger",     breed: "Orange Tabby",      age: 5  },
  { id: 15, name: "Snowball",   breed: "Turkish Angora",    age: 2  },
  { id: 16, name: "Oreo",       breed: "Tuxedo",            age: 6  },
  { id: 17, name: "Pumpkin",    breed: "Scottish Fold",     age: 1  },
  { id: 18, name: "Loki",       breed: "Norwegian Forest",  age: 4  },
  { id: 19, name: "Zelda",      breed: "Sphynx",            age: 3  },
  { id: 20, name: "Cosmo",      breed: "Maine Coon",        age: 7  },
];

async function main() {
  console.log("Inserting 20 cats into Supabase...");

  const { data, error } = await supabase
    .from("cats")
    .insert(cats)
    .select();

  if (error) {
    console.error("Insert failed:", error.message);
    console.error("Code:", error.code);
    console.error("\nIf the table doesn't exist yet, run this SQL in Supabase SQL Editor:");
    console.error(`
CREATE TABLE cats (
  id    integer PRIMARY KEY,
  name  text NOT NULL,
  breed text NOT NULL,
  age   integer NOT NULL
);
    `);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} rows successfully!`);
  console.log("Sample:", data[0]);
}

main();
