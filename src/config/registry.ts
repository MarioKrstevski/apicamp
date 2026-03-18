import type { TableConfig } from "@/types/table";
import usersConfig    from "./tables/users";
import productsConfig from "./tables/products";
import quotesConfig   from "./tables/quotes";
import booksConfig    from "./tables/books";
import studentsConfig from "./tables/students";
import resumesConfig  from "./tables/resumes";
import animalsConfig  from "./tables/animals";

const registry: Record<string, TableConfig> = {
  users:    usersConfig,
  products: productsConfig,
  quotes:   quotesConfig,
  books:    booksConfig,
  students: studentsConfig,
  resumes:  resumesConfig,
  animals:  animalsConfig,
};

export default registry;
