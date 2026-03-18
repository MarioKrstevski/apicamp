import type { TableConfig } from "@/types/category";
import usersConfig from "./tables/users";
import productsConfig from "./tables/products";

const registry: Record<string, TableConfig> = {
  users: usersConfig,
  products: productsConfig,
};

export default registry;
