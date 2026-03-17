import type { CategoryConfig } from "@/types/category";
import usersConfig from "./categories/users";
import productsConfig from "./categories/products";

const registry: Record<string, CategoryConfig> = {
  users: usersConfig,
  products: productsConfig,
};

export default registry;
