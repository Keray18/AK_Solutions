import { db } from '../config/database.js';
import { brands, products } from '../db/schema/products.js';
import { ingredients, productIngredients, ingredientInteractions } from '../db/schema/ingredients.js';
import { articles, articleTags } from '../db/schema/content.js';
import { knowledgeEmbeddings } from '../db/schema/ai.js';
import {
  ProductCategory,
  IngredientCategory,
  InteractionType,
  Severity,
  IrritationPotential,
  EvidenceQuality,
  ArticleCategory,
  KnowledgeSourceType,
} from '../shared/types/enums.js';
import { eq, and } from 'drizzle-orm';

async function seedKnowledge() {
  console.log('🌱 Starting Idempotent Knowledge & Catalog Seeding...');

  // ==========================================
  // 1. Brands
  // ==========================================
  console.log('📦 Seeding Brands...');
  const brandData = [
    { name: 'The Ordinary', slug: 'the-ordinary', country: 'Canada', website: 'https://theordinary.com' },
    { name: "Paula's Choice", slug: 'paulas-choice', country: 'USA', website: 'https://paulaschoice.com' },
    { name: 'CeraVe', slug: 'cerave', country: 'USA', website: 'https://cerave.com' },
    { name: 'COSRX', slug: 'cosrx', country: 'South Korea', website: 'https://cosrx.com' },
    { name: 'La Roche-Posay', slug: 'la-roche-posay', country: 'France', website: 'https://laroche-posay.com' },
    { name: 'Minimalist', slug: 'minimalist', country: 'India', website: 'https://beminimalist.co' },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandData) {
    const existing = await db.select().from(brands).where(eq(brands.slug, b.slug)).limit(1);
    if (existing.length > 0 && existing[0]) {
      brandMap.set(b.slug, existing[0].id);
    } else {
      const [inserted] = await db.insert(brands).values(b).returning();
      if (inserted) brandMap.set(b.slug, inserted.id);
    }
  }
  console.log(`✅ Brands seeded: ${brandMap.size}`);

  // ==========================================
  // 2. Ingredients
  // ==========================================
  console.log('🧪 Seeding Ingredients...');
  const ingredientData = [
    {
      inciName: 'Niacinamide',
      commonName: 'Vitamin B3',
      category: IngredientCategory.VITAMIN,
      description: 'A multi-functional superstar with proven benefits: strengthens barrier, balances sebum, and reduces hyperpigmentation.',
      functions: ['Skin-brightening', 'Anti-acne', 'Moisturizer/Humectant'],
      benefits: ['Improves skin barrier', 'Reduces enlarged pores', 'Regulates sebum production'],
      skinTypeConsiderations: { oily: 'excellent', combination: 'excellent', dry: 'good', sensitive: 'good' },
      concernRelevance: { acne: 'high', oiliness: 'high', visible_pores: 'high', dullness: 'medium' },
      irritationPotential: IrritationPotential.LOW,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Dermatol Ther. 2017;30(3)', 'Int J Cosmet Sci. 2004;26(5):231-8'],
    },
    {
      inciName: 'Salicylic Acid',
      commonName: 'BHA',
      category: IngredientCategory.EXFOLIANT,
      description: 'Oil-soluble beta hydroxy acid that penetrates pores deeply to dissolve sebum and unclog dead skin cells.',
      functions: ['Exfoliant', 'Anti-acne', 'Soothing'],
      benefits: ['Unclogs pores', 'Prevents acne breakouts', 'Refines skin texture'],
      skinTypeConsiderations: { oily: 'excellent', combination: 'good', dry: 'caution', sensitive: 'patch test' },
      concernRelevance: { acne: 'high', visible_pores: 'high', texture: 'high', oiliness: 'high' },
      irritationPotential: IrritationPotential.MEDIUM,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Clin Cosmet Investig Dermatol. 2015;8:455-61'],
    },
    {
      inciName: 'Sodium Hyaluronate',
      commonName: 'Hyaluronic Acid',
      category: IngredientCategory.HUMECTANT,
      description: 'A powerhouse humectant capable of binding up to 1000 times its molecular weight in water to hydrate and plump skin.',
      functions: ['Moisturizer/Humectant'],
      benefits: ['Deep surface hydration', 'Plumps fine dehydration lines', 'Improves skin suppleness'],
      skinTypeConsiderations: { oily: 'excellent', combination: 'excellent', dry: 'excellent', sensitive: 'excellent' },
      concernRelevance: { dryness: 'high', dullness: 'high' },
      irritationPotential: IrritationPotential.MINIMAL,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['J Clin Aesthet Dermatol. 2014;7(3):27-9'],
    },
    {
      inciName: 'Retinol',
      commonName: 'Vitamin A',
      category: IngredientCategory.RETINOID,
      description: 'The gold standard for cellular turnover, collagen preservation, and anti-aging efficacy.',
      functions: ['Cell-communicating ingredient', 'Anti-aging', 'Collagen booster'],
      benefits: ['Reduces fine lines and wrinkles', 'Fades hyperpigmentation', 'Smooths uneven texture'],
      skinTypeConsiderations: { oily: 'good', combination: 'good', dry: 'buffer with moisturizer', sensitive: 'start with low strength' },
      concernRelevance: { aging: 'high', dark_spots: 'high', texture: 'high', acne: 'medium' },
      irritationPotential: IrritationPotential.HIGH,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['J Cosmet Dermatol. 2016;15(1):49-57'],
    },
    {
      inciName: 'Ascorbic Acid',
      commonName: 'Vitamin C',
      category: IngredientCategory.ANTIOXIDANT,
      description: 'Potent antioxidant that neutralizes free radicals, boosts collagen synthesis, and brightens pigmentation.',
      functions: ['Antioxidant', 'Skin-brightening'],
      benefits: ['Fades dark spots', 'Photoprotection support', 'Evens skin tone'],
      skinTypeConsiderations: { oily: 'good', combination: 'good', dry: 'good', sensitive: 'may tingle' },
      concernRelevance: { dark_spots: 'high', dullness: 'high', pigmentation: 'high', aging: 'medium' },
      irritationPotential: IrritationPotential.MEDIUM,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Dermatol Surg. 2008;34(6):790-804'],
    },
    {
      inciName: 'Glycolic Acid',
      commonName: 'AHA',
      category: IngredientCategory.EXFOLIANT,
      description: 'Alpha hydroxy acid with the smallest molecular size, providing effective surface dead cell shedding for radiant skin.',
      functions: ['Exfoliant', 'Skin-brightening'],
      benefits: ['Surface exfoliation', 'Improves glow', 'Smooths rough texture'],
      skinTypeConsiderations: { oily: 'good', combination: 'good', dry: 'use sparingly', sensitive: 'caution' },
      concernRelevance: { texture: 'high', dullness: 'high', dark_spots: 'medium' },
      irritationPotential: IrritationPotential.HIGH,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Dermatol Surg. 2001;27(5):429-33'],
    },
    {
      inciName: 'Ceramide NP',
      commonName: 'Ceramide 3',
      category: IngredientCategory.CERAMIDE,
      description: 'A skin-identical lipid that reinforces the skin’s natural lipid barrier and shields against moisture loss.',
      functions: ['Barrier repair', 'Skin identical'],
      benefits: ['Restores moisture barrier', 'Reduces transepidermal water loss', 'Calms irritation'],
      skinTypeConsiderations: { oily: 'good', combination: 'excellent', dry: 'essential', sensitive: 'essential' },
      concernRelevance: { dryness: 'high', redness: 'high' },
      irritationPotential: IrritationPotential.MINIMAL,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Skin Pharmacol Physiol. 2008;21(2):75-80'],
    },
    {
      inciName: 'Benzoyl Peroxide',
      commonName: 'BPO',
      category: IngredientCategory.ACTIVE,
      description: 'Antimicrobial agent that introduces oxygen into pores to eradicate acne-causing Cutibacterium acnes.',
      functions: ['Anti-acne', 'Antimicrobial'],
      benefits: ['Clears active acne papules', 'Prevents resistant bacterial strains', 'Reduces inflammation'],
      skinTypeConsiderations: { oily: 'good', combination: 'spot treat', dry: 'causes flaking', sensitive: 'high caution' },
      concernRelevance: { acne: 'high' },
      irritationPotential: IrritationPotential.HIGH,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Cochrane Database Syst Rev. 2020;5(5):CD009430'],
    },
    {
      inciName: 'Centella Asiatica Extract',
      commonName: 'Cica',
      category: IngredientCategory.BOTANICAL,
      description: 'Herbal extract rich in madecassoside and asiaticoside that soothes inflammation and accelerates barrier healing.',
      functions: ['Soothing', 'Antioxidant'],
      benefits: ['Calms redness and irritation', 'Speeds wound healing', 'Strengthens compromised skin'],
      skinTypeConsiderations: { oily: 'excellent', combination: 'excellent', dry: 'excellent', sensitive: 'essential' },
      concernRelevance: { redness: 'high', acne: 'medium' },
      irritationPotential: IrritationPotential.MINIMAL,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Adv Exp Med Biol. 2018;1089:125-132'],
    },
    {
      inciName: 'Zinc Oxide',
      commonName: 'Mineral Sunscreen Filter',
      category: IngredientCategory.SUNSCREEN_FILTER,
      description: 'Broad-spectrum physical UV filter that reflects both UVA and UVB rays while soothing sensitive skin.',
      functions: ['Sunscreen filter', 'Soothing'],
      benefits: ['Broad spectrum photoprotection', 'Non-irritating for sensitive skin', 'Soothes inflammation'],
      skinTypeConsiderations: { oily: 'good', combination: 'good', dry: 'pair with moisturizer', sensitive: 'ideal' },
      concernRelevance: { redness: 'high', dark_spots: 'high', aging: 'high' },
      irritationPotential: IrritationPotential.MINIMAL,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['Photodermatol Photoimmunol Photomed. 2019;35(6):442-446'],
    },
    {
      inciName: 'Panthenol',
      commonName: 'Pro-Vitamin B5',
      category: IngredientCategory.VITAMIN,
      description: 'A deeply hydrating provitamin that converts to pantothenic acid in skin, promoting epithelial repair and suppleness.',
      functions: ['Moisturizer/Humectant', 'Soothing'],
      benefits: ['Relieves itching and dryness', 'Accelerates barrier repair', 'Enhances skin hydration'],
      skinTypeConsiderations: { oily: 'excellent', combination: 'excellent', dry: 'excellent', sensitive: 'excellent' },
      concernRelevance: { dryness: 'high', redness: 'high' },
      irritationPotential: IrritationPotential.MINIMAL,
      evidenceQuality: EvidenceQuality.STRONG,
      sourceReferences: ['J Cosmet Sci. 2011;62(4):361-70'],
    },
  ];

  const ingredientMap = new Map<string, string>();
  for (const item of ingredientData) {
    const existing = await db.select().from(ingredients).where(eq(ingredients.inciName, item.inciName)).limit(1);
    if (existing.length > 0 && existing[0]) {
      ingredientMap.set(item.inciName, existing[0].id);
    } else {
      const [inserted] = await db.insert(ingredients).values(item as any).returning();
      if (inserted) ingredientMap.set(item.inciName, inserted.id);
    }
  }
  console.log(`✅ Ingredients seeded: ${ingredientMap.size}`);

  // ==========================================
  // 3. Interactions
  // ==========================================
  console.log('⚡ Seeding Ingredient Interaction Rules...');
  const interactionData = [
    {
      ingA: 'Retinol',
      ingB: 'Salicylic Acid',
      type: InteractionType.CONFLICT,
      severity: Severity.HIGH,
      sameRoutineOk: false,
      sameDayOk: true,
      explanation: 'Both ingredients accelerate cell turnover. Applying them simultaneously in the same routine risks barrier compromise, severe erythema, and excessive peeling.',
      recommendation: 'Use Salicylic Acid in the morning routine and Retinol at night, or alternate nights.',
    },
    {
      ingA: 'Retinol',
      ingB: 'Glycolic Acid',
      type: InteractionType.CONFLICT,
      severity: Severity.HIGH,
      sameRoutineOk: false,
      sameDayOk: true,
      explanation: 'Layering Retinol with AHA Glycolic Acid creates an overly acidic, high-irritation environment that damages the lipid barrier.',
      recommendation: 'Alternate evenings: Glycolic Acid on Night 1, Retinol on Night 2, Hydration/Recovery on Night 3.',
    },
    {
      ingA: 'Benzoyl Peroxide',
      ingB: 'Retinol',
      type: InteractionType.CONFLICT,
      severity: Severity.HIGH,
      sameRoutineOk: false,
      sameDayOk: false,
      explanation: 'Benzoyl Peroxide is a potent oxidizer that chemically degrades Retinol, diminishing its efficacy while multiplying skin dryness.',
      recommendation: 'Do not use together on the same day unless using micro-encapsulated formulations specifically designed for simultaneous use.',
    },
    {
      ingA: 'Retinol',
      ingB: 'Ascorbic Acid',
      type: InteractionType.CAUTION,
      severity: Severity.MEDIUM,
      sameRoutineOk: false,
      sameDayOk: true,
      explanation: 'Ascorbic Acid requires a low pH (<3.5) while Retinol functions best at neutral pH. Layering them directly can cause stinging and reduced stability.',
      recommendation: 'Apply Vitamin C (Ascorbic Acid) in the AM under sunscreen, and reserve Retinol for the PM routine.',
    },
    {
      ingA: 'Salicylic Acid',
      ingB: 'Glycolic Acid',
      type: InteractionType.CAUTION,
      severity: Severity.HIGH,
      sameRoutineOk: false,
      sameDayOk: true,
      explanation: 'Combining AHA and BHA leave-on exfoliants in the same routine doubles acid exposure and heightens the risk of acute chemical irritation.',
      recommendation: 'Use BHA for pore-clearing on targeted oily zones, or alternate days with AHA rather than layering.',
    },
    {
      ingA: 'Sodium Hyaluronate',
      ingB: 'Ceramide NP',
      type: InteractionType.SYNERGY,
      severity: Severity.LOW,
      sameRoutineOk: true,
      sameDayOk: true,
      explanation: 'Hyaluronic Acid pulls water into the epidermis, and Ceramides lock it in by sealing the intercellular matrix, maximizing barrier repair.',
      recommendation: 'Apply Hyaluronic Acid onto slightly damp skin, then immediately follow with a Ceramide-rich moisturizer.',
    },
    {
      ingA: 'Niacinamide',
      ingB: 'Salicylic Acid',
      type: InteractionType.SYNERGY,
      severity: Severity.LOW,
      sameRoutineOk: true,
      sameDayOk: true,
      explanation: 'Niacinamide calms inflammation and balances surface sebum, while Salicylic Acid clears deep pore debris without triggering excess irritation.',
      recommendation: 'Highly compatible. Salicylic Acid can be followed by Niacinamide to soothe and hydrate.',
    },
    {
      ingA: 'Centella Asiatica Extract',
      ingB: 'Retinol',
      type: InteractionType.SYNERGY,
      severity: Severity.LOW,
      sameRoutineOk: true,
      sameDayOk: true,
      explanation: 'Centella Asiatica (Cica) mitigates the retinization period by reducing erythema and boosting barrier recovery without hindering retinoid efficacy.',
      recommendation: 'Layer Centella serum or moisturizer alongside or after Retinol to improve tolerance.',
    },
  ];

  for (const rule of interactionData) {
    const idA = ingredientMap.get(rule.ingA);
    const idB = ingredientMap.get(rule.ingB);
    if (!idA || !idB) continue;

    const existing = await db.select().from(ingredientInteractions)
      .where(and(eq(ingredientInteractions.ingredientAId, idA), eq(ingredientInteractions.ingredientBId, idB)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(ingredientInteractions).values({
        ingredientAId: idA,
        ingredientBId: idB,
        interactionType: rule.type,
        severity: rule.severity,
        sameRoutineOk: rule.sameRoutineOk,
        sameDayOk: rule.sameDayOk,
        explanation: rule.explanation,
        recommendation: rule.recommendation,
        evidenceQuality: EvidenceQuality.STRONG,
      });
    }
  }
  console.log('✅ Interaction rules seeded');

  // ==========================================
  // 4. Products & Product Ingredients
  // ==========================================
  console.log('🛍️ Seeding Products Catalog...');
  const productData = [
    {
      brandSlug: 'cerave',
      name: 'CeraVe Hydrating Facial Cleanser',
      slug: 'cerave-hydrating-cleanser',
      category: ProductCategory.CLEANSER,
      price: '450.00',
      description: 'Gentle, non-foaming lotion cleanser formulated with essential ceramides and hyaluronic acid to cleanse without stripping the moisture barrier.',
      skinTypes: ['dry', 'normal', 'sensitive'],
      concerns: ['dryness', 'redness'],
      hasFragrance: false,
      ingredients: ['Ceramide NP', 'Sodium Hyaluronate'],
    },
    {
      brandSlug: 'cerave',
      name: 'CeraVe Foaming Facial Cleanser',
      slug: 'cerave-foaming-cleanser',
      category: ProductCategory.CLEANSER,
      price: '480.00',
      description: 'Refreshing foaming gel cleanser that removes excess sebum, makeup, and dirt with ceramides, niacinamide, and hyaluronic acid.',
      skinTypes: ['oily', 'combination'],
      concerns: ['oiliness', 'acne'],
      hasFragrance: false,
      ingredients: ['Niacinamide', 'Ceramide NP', 'Sodium Hyaluronate'],
    },
    {
      brandSlug: 'paulas-choice',
      name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
      slug: 'skin-perfecting-2-bha',
      category: ProductCategory.EXFOLIANT,
      price: '1200.00',
      description: 'Cult-favorite leave-on exfoliant with 2% Salicylic Acid that unclogs pores, smooths wrinkles, and evens out skin tone.',
      skinTypes: ['oily', 'combination', 'normal'],
      concerns: ['acne', 'visible_pores', 'texture'],
      hasFragrance: false,
      ingredients: ['Salicylic Acid'],
    },
    {
      brandSlug: 'the-ordinary',
      name: 'The Ordinary Glycolic Acid 7% Toning Solution',
      slug: 'glycolic-acid-7-toning-solution',
      category: ProductCategory.EXFOLIANT,
      price: '950.00',
      description: 'Direct exfoliating toner that improves skin clarity, balances uneven tone, and smooths surface texture over time.',
      skinTypes: ['normal', 'combination', 'oily'],
      concerns: ['texture', 'dullness', 'dark_spots'],
      hasFragrance: false,
      ingredients: ['Glycolic Acid'],
    },
    {
      brandSlug: 'the-ordinary',
      name: 'Niacinamide 10% + Zinc 1%',
      slug: 'niacinamide-10-zinc-1',
      category: ProductCategory.SERUM,
      price: '600.00',
      description: 'High-strength vitamin and mineral blemish formula to reduce the appearance of blemishes and balance visible sebum activity.',
      skinTypes: ['oily', 'combination', 'normal'],
      concerns: ['acne', 'oiliness', 'visible_pores'],
      hasFragrance: false,
      ingredients: ['Niacinamide'],
    },
    {
      brandSlug: 'the-ordinary',
      name: 'Hyaluronic Acid 2% + B5',
      slug: 'hyaluronic-acid-2-b5',
      category: ProductCategory.SERUM,
      price: '700.00',
      description: 'Hydrating water-based serum with multi-molecular hyaluronic acid and pro-vitamin B5 for plumping multi-depth hydration.',
      skinTypes: ['dry', 'normal', 'combination', 'sensitive', 'oily'],
      concerns: ['dryness', 'dullness'],
      hasFragrance: false,
      ingredients: ['Sodium Hyaluronate', 'Panthenol'],
    },
    {
      brandSlug: 'minimalist',
      name: 'Minimalist 10% Vitamin C Serum',
      slug: 'minimalist-10-vitamin-c',
      category: ProductCategory.SERUM,
      price: '699.00',
      description: 'Stabilized pure vitamin C antioxidant serum with Centella Asiatica to fade dark spots and boost skin glow.',
      skinTypes: ['normal', 'combination', 'dry'],
      concerns: ['dark_spots', 'dullness', 'pigmentation'],
      hasFragrance: false,
      ingredients: ['Ascorbic Acid', 'Centella Asiatica Extract'],
    },
    {
      brandSlug: 'the-ordinary',
      name: 'The Ordinary Granactive Retinoid 2% Emulsion',
      slug: 'granactive-retinoid-2-emulsion',
      category: ProductCategory.RETINOID,
      price: '990.00',
      description: 'Advanced retinoid active technology that targets signs of aging with significantly reduced irritation compared to traditional retinol.',
      skinTypes: ['normal', 'combination', 'oily', 'dry'],
      concerns: ['aging', 'texture', 'dark_spots'],
      hasFragrance: false,
      ingredients: ['Retinol'],
    },
    {
      brandSlug: 'minimalist',
      name: 'Minimalist 0.3% Retinol',
      slug: 'minimalist-03-retinol',
      category: ProductCategory.RETINOID,
      price: '599.00',
      description: 'Gentle pure Retinol in soothing Squalane base for visible reduction in fine lines and refined skin texture.',
      skinTypes: ['normal', 'combination', 'oily'],
      concerns: ['aging', 'texture'],
      hasFragrance: false,
      ingredients: ['Retinol'],
    },
    {
      brandSlug: 'paulas-choice',
      name: 'Paula’s Choice CLEAR Daily Skin Clearing Treatment 2.5% BP',
      slug: 'clear-daily-clearing-treatment-bp',
      category: ProductCategory.TREATMENT,
      price: '1800.00',
      description: 'Targeted lotion with 2.5% micronized Benzoyl Peroxide that penetrates pores to stop acne-causing bacteria on contact.',
      skinTypes: ['oily', 'combination'],
      concerns: ['acne'],
      hasFragrance: false,
      ingredients: ['Benzoyl Peroxide'],
    },
    {
      brandSlug: 'cerave',
      name: 'CeraVe Moisturizing Cream',
      slug: 'cerave-moisturizing-cream',
      category: ProductCategory.MOISTURIZER,
      price: '650.00',
      description: 'Rich, non-greasy cream with 3 essential ceramides and hyaluronic acid that provides 24-hour hydration and barrier protection.',
      skinTypes: ['dry', 'normal', 'sensitive'],
      concerns: ['dryness', 'redness'],
      hasFragrance: false,
      ingredients: ['Ceramide NP', 'Sodium Hyaluronate'],
    },
    {
      brandSlug: 'cosrx',
      name: 'COSRX Advanced Snail 92 All in one Cream',
      slug: 'cosrx-snail-92-cream',
      category: ProductCategory.MOISTURIZER,
      price: '1550.00',
      description: 'Lightweight gel cream that infuses lasting moisture, calms irritated post-breakout skin, and improves skin elasticity.',
      skinTypes: ['dry', 'combination', 'normal', 'sensitive'],
      concerns: ['dryness', 'texture', 'dullness'],
      hasFragrance: false,
      ingredients: ['Sodium Hyaluronate', 'Panthenol'],
    },
    {
      brandSlug: 'la-roche-posay',
      name: 'La Roche-Posay Anthelios UVMune 400 Invisible Fluid',
      slug: 'anthelios-uvmune-400',
      category: ProductCategory.SUNSCREEN,
      price: '1950.00',
      description: 'Ultra-long UVA protection invisible fluid sunscreen, non-comedogenic and water-resistant for all skin types including sensitive.',
      skinTypes: ['oily', 'combination', 'normal', 'sensitive', 'dry'],
      concerns: ['dark_spots', 'aging', 'redness'],
      hasFragrance: false,
      ingredients: ['Zinc Oxide', 'Panthenol'],
    },
  ];

  for (const p of productData) {
    const brandId = brandMap.get(p.brandSlug);
    if (!brandId) continue;

    let productId: string;
    const existing = await db.select().from(products).where(eq(products.slug, p.slug)).limit(1);

    if (existing.length > 0 && existing[0]) {
      productId = existing[0].id;
      // Update details to make sure skinTypeSuitability and price are fresh
      await db.update(products).set({
        brandId,
        name: p.name,
        category: p.category,
        price: p.price,
        description: p.description,
        skinTypeSuitability: p.skinTypes,
        concernSuitability: p.concerns,
        hasFragrance: p.hasFragrance,
        available: true,
      }).where(eq(products.id, productId));
    } else {
      const [inserted] = await db.insert(products).values({
        brandId,
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: p.price,
        description: p.description,
        skinTypeSuitability: p.skinTypes,
        concernSuitability: p.concerns,
        hasFragrance: p.hasFragrance,
        available: true,
      }).returning();
      if (!inserted) continue;
      productId = inserted.id;
    }

    // Map ingredients
    let pos = 1;
    for (const ingName of p.ingredients) {
      const ingId = ingredientMap.get(ingName);
      if (!ingId) continue;

      const mappingExists = await db.select().from(productIngredients)
        .where(and(eq(productIngredients.productId, productId), eq(productIngredients.ingredientId, ingId)))
        .limit(1);

      if (mappingExists.length === 0) {
        await db.insert(productIngredients).values({
          productId,
          ingredientId: ingId,
          position: pos++,
          isKeyIngredient: true,
        });
      }
    }
  }
  console.log('✅ Products & ingredient mappings seeded');

  // ==========================================
  // 5. Educational Articles
  // ==========================================
  console.log('📚 Seeding Educational Articles...');
  const articleData = [
    {
      title: 'The Complete Guide to Retinoids: Anti-Aging and Acne',
      slug: 'complete-guide-to-retinoids',
      category: ArticleCategory.INGREDIENT_GUIDE,
      excerpt: 'Learn how Retinol works, how to introduce it without irritation (sandwich method), and which ingredients to avoid pairing with it.',
      content: `Retinoids (including over-the-counter Retinol and prescription Tretinoin) are vitamin A derivatives that communicate directly with skin cells to normalize turnover.

Key Rules for Retinol:
1. Start slow: 2 evenings per week for the first 2 weeks, then alternate nights.
2. The Sandwich Method: Apply a thin layer of moisturizer, followed by Retinol, followed by another layer of moisturizer to reduce transepidermal water loss.
3. Ingredient Conflicts: Never layer Retinol directly with strong chemical exfoliants (Glycolic Acid, Salicylic Acid) or Benzoyl Peroxide in the same routine.
4. Sun Protection: Retinol increases cellular turnover and renders skin more susceptible to UV photodamage. Broad-spectrum SPF is non-negotiable every morning.`,
      tags: ['retinoids', 'anti-aging', 'acne', 'actives'],
    },
    {
      title: 'Understanding Chemical Exfoliation: AHA vs BHA Differences',
      slug: 'understanding-chemical-exfoliation-aha-bha',
      category: ArticleCategory.SKINCARE_BASICS,
      excerpt: 'Alpha Hydroxy Acids (AHAs) vs Beta Hydroxy Acids (BHAs): which one suits your skin concerns and how to avoid over-exfoliation.',
      content: `Chemical exfoliants remove dead skin cells without the micro-tears caused by physical scrubs.

AHA (Alpha Hydroxy Acids such as Glycolic and Lactic Acid):
- Water-soluble.
- Work primarily on the surface layer of skin.
- Ideal for dry, sun-damaged, or dull skin seeking enhanced glow and refined texture.

BHA (Salicylic Acid):
- Lipid-soluble.
- Able to penetrate into the pore lining to dissolve accumulated sebum and debris.
- Ideal for oily, congested, and acne-prone skin with blackheads or enlarged pores.

Golden Rule: Do not combine AHA and BHA in the same routine unless formulated together at stabilized low concentrations. Over-exfoliation weakens the skin lipid barrier, leading to stinging, dehydration, and increased breakouts.`,
      tags: ['exfoliation', 'aha', 'bha', 'salicylic-acid', 'glycolic-acid'],
    },
    {
      title: 'How to Repair and Maintain Your Skin Barrier',
      slug: 'how-to-repair-skin-barrier',
      category: ArticleCategory.ROUTINE_GUIDE,
      excerpt: 'Symptoms of a damaged skin barrier and the scientific protocol to restore moisture, ceramides, and resilience.',
      content: `The stratum corneum is your skin's front-line defense, often described as a 'brick and mortar' structure where corneocytes are bricks and lipids (ceramides, cholesterol, fatty acids) are mortar.

Signs of Barrier Compromise:
- Stinging upon applying even gentle moisturizers or water.
- Persistent tight feeling with surface dehydration.
- Sudden flare-ups of redness, flaky patches, or increased sensitivity.

Barrier Restoration Protocol:
1. Pause all direct acids (AHA, BHA), Retinoids, and high-percentage L-Ascorbic Acid for 2–3 weeks.
2. Switch to a non-foaming, sulfate-free gentle cleanser.
3. Apply humectants (Hyaluronic Acid, Glycerin, Panthenol) on damp skin.
4. Seal with a lipid-replenishing moisturizer containing Ceramide NP and Centella Asiatica.`,
      tags: ['barrier-repair', 'ceramides', 'cica', 'sensitivity', 'hydration'],
    },
    {
      title: 'Combining Active Ingredients: How to Avoid Conflict',
      slug: 'combining-active-ingredients-safely',
      category: ArticleCategory.ROUTINE_GUIDE,
      excerpt: 'Master the chemistry of layering skincare: which actives synergize and which combinations trigger severe reactions.',
      content: `Combining skincare actives requires understanding their pH dependency, mechanism of action, and irritation thresholds.

Proven Synergies:
- Hyaluronic Acid + Ceramides: Draws hydration into the epidermis and locks it in.
- Niacinamide + Salicylic Acid: Niacinamide regulates sebum and calms inflammation while BHA clears pore congestion.
- Centella Asiatica + Retinol: Cica soothes retinoid-induced erythema.

High-Risk Conflicts:
- Retinol + Salicylic Acid / Glycolic Acid: Excessive irritation; alternate days or separate AM/PM.
- Benzoyl Peroxide + Retinol: Mutual oxidative degradation and severe dryness.
- Vitamin C (Ascorbic Acid) + Retinol in same routine: Low pH incompatibility; use Vitamin C in AM and Retinol in PM.`,
      tags: ['layering', 'ingredients', 'conflicts', 'synergy'],
    },
  ];

  for (const art of articleData) {
    const existing = await db.select().from(articles).where(eq(articles.slug, art.slug)).limit(1);
    let artId: string;
    if (existing.length > 0 && existing[0]) {
      artId = existing[0].id;
      await db.update(articles).set({
        title: art.title,
        category: art.category,
        excerpt: art.excerpt,
        content: art.content,
        published: true,
      }).where(eq(articles.id, artId));
    } else {
      const [inserted] = await db.insert(articles).values({
        title: art.title,
        slug: art.slug,
        category: art.category,
        excerpt: art.excerpt,
        content: art.content,
        published: true,
      }).returning();
      if (!inserted) continue;
      artId = inserted.id;
    }

    // Add tags
    for (const tag of art.tags) {
      const tagExists = await db.select().from(articleTags)
        .where(and(eq(articleTags.articleId, artId), eq(articleTags.tag, tag)))
        .limit(1);
      if (tagExists.length === 0) {
        await db.insert(articleTags).values({ articleId: artId, tag });
      }
    }
  }
  console.log('✅ Educational articles seeded');

  // ==========================================
  // 6. Knowledge Embeddings Table (RAG Chunks)
  // ==========================================
  console.log('🧠 Seeding Knowledge Retrieval Chunks...');
  const knowledgeChunks = [
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'complete-guide-to-retinoids',
      title: 'Retinoid Usage, Sandwich Method & Conflicts',
      content: 'Retinol accelerates cell turnover for anti-aging and acne. Use sandwich method with moisturizer to mitigate irritation. Do not combine with Salicylic Acid, Glycolic Acid, or Benzoyl Peroxide in the same routine. Always wear broad-spectrum sunscreen.',
      metadata: { category: 'retinoid_guide', safety: 'educational' },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'understanding-chemical-exfoliation-aha-bha',
      title: 'AHA vs BHA Chemical Exfoliation Rules',
      content: 'AHAs (Glycolic Acid) are water-soluble for surface glow and texture. BHAs (Salicylic Acid) are oil-soluble to penetrate and clear pore congestion. Do not layer together in one routine to prevent severe moisture barrier compromise.',
      metadata: { category: 'exfoliation_guide', safety: 'educational' },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'how-to-repair-skin-barrier',
      title: 'Skin Barrier Repair Protocol and Ceramides',
      content: 'A compromised barrier shows stinging, tight dehydrated skin, and redness. Pause all exfoliants and retinoids for 2 weeks. Use Ceramide NP, Hyaluronic Acid, and Centella Asiatica to restore lipid integrity.',
      metadata: { category: 'barrier_repair', safety: 'educational' },
    },
    {
      sourceType: KnowledgeSourceType.INGREDIENT,
      sourceId: 'niacinamide',
      title: 'Niacinamide Clinical Profile and Benefits',
      content: 'Niacinamide (Vitamin B3) balances sebum production, reduces enlarged pores, strengthens ceramide synthesis, and lightens post-inflammatory hyperpigmentation. It is highly tolerable across all skin types.',
      metadata: { category: 'ingredient_profile', safety: 'educational' },
    },
    {
      sourceType: KnowledgeSourceType.INTERACTION_RULE,
      sourceId: 'retinol-salicylic-acid',
      title: 'Retinol and Salicylic Acid Interaction Rule',
      content: 'Retinol and Salicylic Acid are in direct conflict in the same routine due to compounded irritation and barrier peeling. Salicylic Acid can be used in the morning and Retinol in the evening, or on alternating days.',
      metadata: { category: 'conflict_rule', safety: 'educational' },
    },
  ];

  // A valid 1536-dimensional normalized vector placeholder for pgvector indexing
  const dummy1536 = new Array(1536).fill(0);
  dummy1536[0] = 0.5;
  dummy1536[1] = 0.5;

  for (const chunk of knowledgeChunks) {
    const existing = await db.select().from(knowledgeEmbeddings)
      .where(and(eq(knowledgeEmbeddings.sourceType, chunk.sourceType), eq(knowledgeEmbeddings.sourceId, chunk.sourceId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(knowledgeEmbeddings).values({
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        title: chunk.title,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: dummy1536,
      });
    }
  }
  console.log('✅ Knowledge retrieval chunks seeded');

  console.log('\n🎉 ALL KNOWLEDGE & CATALOG SEEDED SUCCESSFULLY AND IDEMPOTENTLY!');
  process.exit(0);
}

seedKnowledge().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
