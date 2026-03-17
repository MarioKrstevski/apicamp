-- Products seed data for user_rows
-- All fields from config are present (v1 + v2 + v3 and extra: inStock, releaseDate, externalUrl, supplierEmail, brandId).
--
-- Before running: replace the placeholder UUID below with your locale admin's auth.users.id
-- (Supabase Dashboard → Authentication → Users → copy the user UUID).
-- Find and replace:  aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee  with your locale admin UUID.

INSERT INTO public.user_rows (user_id, category, locale, is_system, data)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
    'products',
    'en',
    true,
    '{
      "name": "Wireless Headphones Pro",
      "description": "Noise-cancelling over-ear headphones with 30h battery life and premium drivers.",
      "price": 149.99,
      "stock": 85,
      "inStock": true,
      "category": "electronics",
      "tags": ["new", "bestseller"],
      "rating": 4.7,
      "images": ["https://example.com/img/headphones-1.jpg", "https://example.com/img/headphones-2.jpg"],
      "releaseDate": "2024-01-15",
      "externalUrl": "https://example.com/headphones-pro",
      "supplierEmail": "audio@supplier.example.com",
      "meta": {"weight": "280g", "driverSize": "40mm", "colors": ["black", "silver"]},
      "brandId": null
    }'::jsonb
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
    'products',
    'en',
    true,
    '{
      "name": "Organic Cotton T-Shirt",
      "description": "Soft unisex tee made from 100% organic cotton. Available in multiple colors.",
      "price": 29.50,
      "stock": 420,
      "inStock": true,
      "category": "clothing",
      "tags": ["sale", "featured"],
      "rating": 4.3,
      "images": ["https://example.com/img/tshirt-1.jpg"],
      "releaseDate": "2023-06-01",
      "externalUrl": "https://example.com/tshirt-organic",
      "supplierEmail": "apparel@supplier.example.com",
      "meta": {"sizes": ["S", "M", "L", "XL"], "material": "organic cotton"},
      "brandId": null
    }'::jsonb
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
    'products',
    'en',
    true,
    '{
      "name": "Gourmet Coffee Beans 1kg",
      "description": "Single-origin Arabica beans, medium roast. Perfect for espresso and filter.",
      "price": 18.00,
      "stock": 0,
      "inStock": false,
      "category": "food",
      "tags": ["limited"],
      "rating": 4.9,
      "images": ["https://example.com/img/coffee-1.jpg", "https://example.com/img/coffee-2.jpg"],
      "releaseDate": "2024-03-01",
      "externalUrl": "https://example.com/coffee-beans",
      "supplierEmail": "food@supplier.example.com",
      "meta": {"origin": "Colombia", "roast": "medium", "certifications": ["Fair Trade"]},
      "brandId": null
    }'::jsonb
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
    'products',
    'en',
    true,
    '{
      "name": "REST API Cookbook",
      "description": "A practical guide to designing and building RESTful APIs with examples in multiple languages.",
      "price": 44.99,
      "stock": 120,
      "inStock": true,
      "category": "books",
      "tags": ["new", "featured", "bestseller"],
      "rating": 4.6,
      "images": ["https://example.com/img/book-api.jpg"],
      "releaseDate": "2024-02-20",
      "externalUrl": "https://example.com/books/rest-api-cookbook",
      "supplierEmail": "publisher@example.com",
      "meta": {"isbn": "978-0-123456-78-9", "pages": 380},
      "brandId": null
    }'::jsonb
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
    'products',
    'en',
    true,
    '{
      "name": "Running Shoes Ultra",
      "description": "Lightweight performance runners with responsive cushioning and breathable upper.",
      "price": 129.00,
      "stock": 65,
      "inStock": true,
      "category": "sports",
      "tags": ["new", "featured"],
      "rating": 4.5,
      "images": ["https://example.com/img/shoes-1.jpg", "https://example.com/img/shoes-2.jpg", "https://example.com/img/shoes-3.jpg"],
      "releaseDate": "2024-04-01",
      "externalUrl": "https://example.com/running-shoes-ultra",
      "supplierEmail": "sports@supplier.example.com",
      "meta": {"sizes": ["US 7-12"], "weight": "220g per shoe"},
      "brandId": null
    }'::jsonb
  );
