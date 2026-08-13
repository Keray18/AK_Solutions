import { db } from '../config/database.js';
import { brands, products } from '../db/schema/products.js';
import { ingredients, productIngredients, ingredientInteractions } from '../db/schema/ingredients.js';
import { ProductCategory, IngredientCategory, InteractionType, Severity } from '../shared/types/enums.js';

async function seedKnowledge() {
  console.log('🌱 Seeding Knowledge Layer...');

  // 1. Brands
  console.log('Seeding Brands...');
  const [ordinary] = await db.insert(brands).values({
    name: 'The Ordinary',
    slug: 'the-ordinary',
    country: 'Canada'
  }).returning();

  const [paulasChoice] = await db.insert(brands).values({
    name: "Paula's Choice",
    slug: 'paulas-choice',
    country: 'USA'
  }).returning();

  // 2. Ingredients
  console.log('Seeding Ingredients...');
  const [niacinamide] = await db.insert(ingredients).values({
    inciName: 'Niacinamide',
    commonName: 'Vitamin B3',
    category: IngredientCategory.VITAMIN,
    description: 'A multi-functional skincare superstar with several proven benefits.',
    functions: ['Skin-brightening', 'Anti-acne', 'Moisturizer/Humectant'],
    benefits: ['Improves skin barrier', 'Reduces enlarged pores']
  }).returning();

  const [salicylicAcid] = await db.insert(ingredients).values({
    inciName: 'Salicylic Acid',
    commonName: 'BHA',
    category: IngredientCategory.EXFOLIANT,
    description: 'A beta hydroxy acid that exfoliates the skin.',
    functions: ['Exfoliant', 'Anti-acne', 'Soothing']
  }).returning();

  const [hyaluronicAcid] = await db.insert(ingredients).values({
    inciName: 'Sodium Hyaluronate',
    commonName: 'Hyaluronic Acid',
    category: IngredientCategory.HUMECTANT,
    description: 'A powerful humectant that draws moisture into the skin.',
    functions: ['Moisturizer/Humectant']
  }).returning();

  const [retinol] = await db.insert(ingredients).values({
    inciName: 'Retinol',
    commonName: 'Vitamin A',
    category: IngredientCategory.RETINOID,
    description: 'Gold standard for anti-aging.',
    functions: ['Cell-communicating ingredient']
  }).returning();

  await db.insert(ingredients).values({
    inciName: 'Ascorbic Acid',
    commonName: 'Vitamin C',
    category: IngredientCategory.ANTIOXIDANT,
    description: 'Pure vitamin C.',
    functions: ['Antioxidant', 'Skin-brightening']
  }).returning();

  // 3. Interactions
  console.log('Seeding Interactions...');
  await db.insert(ingredientInteractions).values({
    ingredientAId: retinol!.id,
    ingredientBId: salicylicAcid!.id,
    interactionType: InteractionType.CAUTION,
    severity: Severity.HIGH,
    explanation: 'Both ingredients speed up cell turnover and can cause significant irritation when used together.',
    recommendation: 'Use Salicylic Acid in the morning and Retinol at night, or alternate nights.',
    sameDayOk: true,
    sameRoutineOk: false
  });

  // 4. Products
  console.log('Seeding Products...');
  const [prod1] = await db.insert(products).values({
    brandId: ordinary!.id,
    name: 'Niacinamide 10% + Zinc 1%',
    slug: 'niacinamide-10-zinc-1',
    category: ProductCategory.SERUM,
    price: '600',
    description: 'High-strength vitamin and mineral blemish formula.',
  }).returning();

  const [prod2] = await db.insert(products).values({
    brandId: paulasChoice!.id,
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    slug: 'skin-perfecting-2-bha',
    category: ProductCategory.EXFOLIANT,
    price: '3000',
    description: 'A daily leave-on exfoliant with 2% BHA.',
  }).returning();

  const [prod3] = await db.insert(products).values({
    brandId: ordinary!.id,
    name: 'Hyaluronic Acid 2% + B5',
    slug: 'hyaluronic-acid-2-b5',
    category: ProductCategory.SERUM,
    price: '700',
  }).returning();

  // 5. Product Ingredients
  await db.insert(productIngredients).values([
    { productId: prod1!.id, ingredientId: niacinamide!.id, position: 1, isKeyIngredient: true },
    { productId: prod2!.id, ingredientId: salicylicAcid!.id, position: 1, isKeyIngredient: true },
    { productId: prod3!.id, ingredientId: hyaluronicAcid!.id, position: 1, isKeyIngredient: true },
  ]);

  console.log('✅ Knowledge Layer Seeded Successfully');
  process.exit(0);
}

seedKnowledge().catch(err => {
  console.error('❌ Seeding failed', err);
  process.exit(1);
});
