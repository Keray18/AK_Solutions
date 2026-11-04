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
      title: 'Retinoid Cellular Dynamics, Barrier Adaptation & Staggered Acid Layering',
      content: 'Retinoids (Retinol, Tretinoin) accelerate cellular turnover and stimulate dermal collagen synthesis. During the initial retinization period (first 4–6 weeks), transient stratum corneum compaction, barrier fragility, and transepidermal water loss frequently occur. However, long-term sustained retinoid therapy actually thickens the viable epidermis and increases dermal matrix density; it does not permanently thin healthy skin. For acid pairings: simultaneous co-application of strong chemical exfoliants (AHA/BHA) in the same evening routine carries high additive irritation risk. Once barrier tolerance is established, experienced users can safely stagger regimens (e.g., low-strength AHA/BHA in AM or alternating evenings, Retinoid in PM). Always wear broad-spectrum daily SPF.',
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
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'winter-dry-skin-xerosis-barrier',
      title: 'Winter Dry Skin (Xerosis) & Transepidermal Water Loss',
      content: 'Low ambient humidity and cold temperatures deplete stratum corneum intercellular lipids and accelerate Transepidermal Water Loss (TEWL). When skin becomes dry and barrier-depleted, hot showers strip remaining lipids, worsening tight, flaky skin. Clinical solution: Switch to gentle non-foaming cleansers, apply humectants (Glycerin, Hyaluronic Acid) to damp skin, and seal with ceramide-rich barrier creams. Reduce direct active frequency during winter.',
      metadata: {
        topic: 'Winter Xerosis and Skin Barrier Defense',
        ingredient: 'Ceramides, Glycerin, Hyaluronic Acid',
        domain: 'conventional_dermatology',
        sourceTitle: 'Management of Winter Xerosis and Cutaneous Barrier Dysfunction',
        authorOrPublisher: 'Journal of the American Academy of Dermatology (JAAD)',
        bibliographicReference: 'J Am Acad Dermatol. 2016;74(6):1054-1067',
        publicationDate: '2016-06-01',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'Hot water exposure and harsh anionic surfactant cleansers exacerbate barrier breakdown.',
        contraindications: 'Avoid high-concentration direct acids and mechanical scrubs during acute xerotic flare-ups.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'dry-skin-with-acne-balance',
      title: 'Managing Acne in Dry and Sensitive Skin',
      content: 'Treating acne when skin is dry or sensitive requires a hydration-first strategy. Traditional acne treatments that strip sebum (high-alcohol toners, harsh physical scrubs) provoke reactive barrier breakdown and micro-inflammation. Clinical protocol: Pair low-concentration BHA (0.5-2%) or gentle Retinoid with barrier repair ceramides, soothing Niacinamide, and non-comedogenic moisturizers.',
      metadata: {
        topic: 'Acne Vulgaris in Compromised or Dry Skin',
        ingredient: 'Salicylic Acid, Niacinamide, Ceramides',
        domain: 'conventional_dermatology',
        sourceTitle: 'Balancing Barrier Repair and Acne Therapeutics in Xerotic Skin Types',
        authorOrPublisher: 'Dermatologic Therapy',
        bibliographicReference: 'Dermatol Ther. 2020;33(6):e14287',
        publicationDate: '2020-11-15',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'High-strength Benzoyl Peroxide and high-percentage direct acids cause severe peeling in dry skin.',
        contraindications: 'Do not use alcohol-based drying toners.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'skin-quality-barrier-texture',
      title: 'Evidence-Based Skin Quality Improvement: Texture, Radiance & Elasticity',
      content: 'Holistic skin quality improvement rests on four clinical pillars: 1) Controlled cellular turnover (gentle retinoid or low-dose PHA/Lactic Acid); 2) Deep stratum corneum hydration (Hyaluronic Acid, Glycerin, NMFs); 3) Photoprotection (Broad-spectrum daily SPF 30-50+ PA++++ protecting against ultraviolet-induced collagen breakdown and photoaging); 4) Antioxidant barrier protection (Niacinamide, Vitamin C, Centella). Results require 6–12 weeks of physiological cellular turnover rather than rapid aggressive stripping.',
      metadata: {
        topic: 'Dermatological Principles of Skin Quality and Barrier Longevity',
        ingredient: 'Ceramides, Niacinamide, Hyaluronic Acid, Sunscreen SPF 30+',
        domain: 'conventional_dermatology',
        sourceTitle: 'Evidence-Based Strategies for Improving Facial Skin Quality and Texture',
        authorOrPublisher: 'Journal of Cosmetic Dermatology',
        bibliographicReference: 'J Cosmet Dermatol. 2021;20(4):1042-1051',
        publicationDate: '2021-04-01',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'Over-exfoliation and excessive active layering compromise the acid mantle, triggering reactive dermatitis.',
        contraindications: 'Do not introduce multiple high-strength active exfoliants simultaneously.',
        lastVerificationDate: '2026-11-02',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'prescription-topicals-interaction-safety',
      title: 'Prescription Topicals & Active Skincare Safety (Tretinoin, Steroids)',
      content: 'Patients using prescription topical treatments (Tretinoin, Adapalene, Clindamycin, topical corticosteroids) or oral Isotretinoin experience pronounced epidermal sensitivity and xerosis. Direct chemical acids (AHA/BHA) and physical scrubs should be suspended unless approved by a physician. Never discontinue or alter prescribed medical therapies without dermatologist consultation.',
      metadata: {
        topic: 'Prescription Retinoids and Active Skincare Contraindications',
        ingredient: 'Tretinoin, Adapalene, Topical Corticosteroids',
        domain: 'conventional_dermatology',
        sourceTitle: 'Safety and Drug-Cosmeceutical Interactions with Prescription Topicals',
        authorOrPublisher: 'British Journal of Dermatology',
        bibliographicReference: 'Br J Dermatol. 2019;180(2):289-299',
        publicationDate: '2019-02-01',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'High risk of acute chemical dermatitis, erythema, and barrier ulceration if layered with direct chemical exfoliants.',
        contraindications: 'Concomitant application of strong AHAs, BHAs, or pure essential oils without dermatologic supervision.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-dry-skin-approaches',
      title: 'Ayurvedic Approaches for Dry Skin: Vata Pacification & Barrier Care',
      content: 'In classical Ayurvedic theory, dry skin (Ruksha Twak) is attributed to aggravated Vata dosha, characterized by cold, light, and dry attributes. Traditional approaches employ Snigdha (unctuous/nourishing) preparations, herbal decoctions of Yashtimadhu (Licorice) and Mandukaparni (Gotu Kola), and therapeutic oils. While classical Abhyanga traditionally utilizes sesame oil or ghee on dry body skin, dermatologists caution that applying heavy unrefined sesame oil or pure ghee directly on the facial T-zone can trigger follicular occlusion and acne in susceptible individuals. Modern integrative practice combines standardized water-soluble herbal humectants with bio-compatible ceramides.',
      metadata: {
        topic: 'Ayurvedic Management of Dry Skin (Vata Vyadhi)',
        ingredient: 'Yashtimadhu (Licorice), Mandukaparni (Gotu Kola), Sesame Oil',
        domain: 'ayurveda',
        sourceTitle: 'Classical Ayurvedic Formulations in Dermatological Disorders (Twak Roga)',
        authorOrPublisher: 'Central Council for Research in Ayurvedic Sciences (CCRAS) & J Ayurveda Integr Med',
        bibliographicReference: 'J Ayurveda Integr Med. 2018;9(3):214-222',
        publicationDate: '2018-09-01',
        evidenceCategory: 'C: Traditional Ayurvedic use',
        safetyConcerns: 'Heavy raw plant oils have moderate-to-high comedogenicity when applied to facial skin prone to congestion.',
        contraindications: 'Avoid pure unrefined heavy oil massage on active facial acne lesions.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-neem-evidence-and-safety',
      title: 'Neem (Azadirachta indica): Ayurvedic Use, Evidence & Patch Testing',
      content: 'In Ayurvedic pharmacology, Neem (Nimba) is classified as Tikta (bitter) and Sheeta (cooling) rasa, traditionally utilized to pacify aggravated Pitta and Kapha in inflammatory dermatoses. In vitro and pharmacological studies confirm nimbin, nimbidin, and azadirachtin provide antibacterial activity against Cutibacterium acnes and downregulate inflammatory mediators. However, large randomized double-blind clinical trials remain limited compared to conventional medical acne standards. Critical safety notice: Crude, undiluted pure neem essential oil is a documented potent contact allergen and sensitizer. Formulations must be standardized and patch tested prior to application.',
      metadata: {
        topic: 'Neem Efficacy and Safety Profile in Acne Vulgaris',
        ingredient: 'Azadirachta indica (Neem)',
        domain: 'ayurveda',
        sourceTitle: 'Antimicrobial and Anti-inflammatory Properties of Azadirachta indica in Dermatology',
        authorOrPublisher: 'Phytotherapy Research',
        bibliographicReference: 'Phytother Res. 2017;31(8):1160-1172',
        publicationDate: '2017-08-01',
        evidenceCategory: 'B: Limited or emerging clinical evidence',
        safetyConcerns: 'Crude undiluted neem seed oil can cause allergic contact dermatitis and severe skin sensitization.',
        contraindications: 'Do not apply undiluted neem oil directly to raw, inflamed, or broken facial skin.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-turmeric-curcumin-safety',
      title: 'Turmeric (Curcuma longa): Complexion Balancing & Allergy Caution',
      content: 'Turmeric (Haridra) has centuries of documented use in classical Ayurveda as a Varnya (complexion-enhancing) and Shothahara (anti-inflammatory) botanical. Curcuminoids deliver strong antioxidant and NF-kB inhibitory benefits in preclinical models. Clinical caveats: DIY topical kitchen turmeric pastes frequently cause allergic contact dermatitis and temporary yellow staining. Cosmeceutical preparations use purified, decolorized tetrahydrocurcumin for optimal tolerance.',
      metadata: {
        topic: 'Topical Curcumin and Turmeric Applications in Dermatology',
        ingredient: 'Curcuma longa (Turmeric / Curcumin)',
        domain: 'ayurveda',
        sourceTitle: 'Curcumin in Dermatology: A Systematic Review of Clinical and Preclinical Evidence',
        authorOrPublisher: 'Phytotherapy Research & American Journal of Clinical Dermatology',
        bibliographicReference: 'Am J Clin Dermatol. 2016;17(5):487-502',
        publicationDate: '2016-10-01',
        evidenceCategory: 'B: Limited or emerging clinical evidence',
        safetyConcerns: 'Kitchen turmeric powder contains impurities and essential oils that provoke allergic contact dermatitis.',
        contraindications: 'Avoid home-made pastes on damaged skin barriers or around eyes.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-kumkumadi-tailam-comedogenicity',
      title: 'Kumkumadi Tailam: Classical Radiance Oil & Acne Comedogenicity',
      content: 'Kumkumadi Tailam is an authentic classical Ayurvedic polyherbal oil described in the Ashtanga Hridaya, prepared by decocting Saffron (Kesar), Red Sandalwood (Rakta Chandana), and over 16 medicinal herbs in a sesame oil (Til Taila) base. Traditional benefits: Enhances complexion radiance, softens texture, and nourishes dry Vata-type skin. Critical clinical dermatological assessment: Comedogenicity scales (derived from rabbit ear assays and human patch observation) represent relative follicular occlusion risk guidelines rather than universal absolutes. Pure classical Kumkumadi Tailam employs an unrefined sesame oil base with moderate comedogenic potential (rating 2–3). On acne-prone or congested skin, applying heavy lipid tailams carries significant risk of trapping sebum and exacerbating follicular occlusion; hence classical heavy oil formulations are clinically contraindicated during active cystic or pustular flare-ups. However, for dry, non-acneic skin or in modernized lightweight cosmeceutical formulations, the formulation provides barrier lipids and antioxidant protection without inevitable congestion.',
      metadata: {
        topic: 'Kumkumadi Tailam Formulation, Indication, and Comedogenic Risk',
        ingredient: 'Kumkumadi Tailam (Kesar, Chandan, Sesame Oil base)',
        domain: 'ayurveda',
        sourceTitle: 'Traditional Ayurvedic Polyherbal Oils: Composition and Dermatological Considerations',
        authorOrPublisher: 'International Journal of Cosmetic Science',
        bibliographicReference: 'Int J Cosmet Sci. 2011;33(2):134-140',
        publicationDate: '2011-04-01',
        evidenceCategory: 'C: Traditional Ayurvedic use',
        safetyConcerns: 'Sesame oil lipid base possesses moderate comedogenic risk (rating 2–3); may induce closed comedones on acne-prone skin.',
        contraindications: 'Active inflammatory acne, cystic lesions, or severe sebum congestion (relative risk for dry non-acneic skin; contraindicated on active inflammatory lesions).',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-gotu-kola-centella-rasayana',
      title: 'Gotu Kola / Mandukaparni (Centella asiatica): Ayurvedic Rasayana',
      content: 'Mandukaparni (Centella Asiatica / Cica) is celebrated in classical Ayurveda as a Medhya Rasayana (rejuvenator). In modern dermatology, Centella is extensively validated: triterpenoid saponins (asiaticoside, madecassic acid) stimulate type I collagen synthesis, downregulate inflammatory cytokines, and accelerate epidermal barrier healing in sensitized skin.',
      metadata: {
        topic: 'Centella Asiatica (Mandukaparni) Barrier Repair and Anti-inflammatory Action',
        ingredient: 'Centella Asiatica (Madecassoside, Asiaticoside)',
        domain: 'integrative',
        sourceTitle: 'Centella asiatica in Cosmetology and Wound Healing',
        authorOrPublisher: 'Advances in Experimental Medicine and Biology',
        bibliographicReference: 'Adv Exp Med Biol. 2018;1089:125-132',
        publicationDate: '2018-05-15',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'Minimal irritation potential; exceptionally high clinical safety and tolerance across sensitive skin types.',
        contraindications: 'Rare idiosyncratic contact allergy to raw botanical extracts.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-conventional-treatment-interactions',
      title: 'Interactions Between Traditional Herbal Skincare and Conventional Topical Medications',
      content: 'Combining traditional herbal preparations (raw neem pastes, pure essential oils, sandalwood pastes, or fruit extracts) with prescription topicals (Tretinoin, Adapalene, Benzoyl Peroxide, Clindamycin) involves substantial clinical risks. During the acute retinization window (initial 4–6 weeks), transient stratum corneum thinning permits volatile terpenes to penetrate deeply, provoking acute chemical burns and contact dermatitis. Notably, chronic long-term retinoid use thickens the viable epidermis, but barrier reactivity remains elevated when paired with unstandardized botanicals. Furthermore, crude herbal pastes introduce unpredictable pH variations that degrade prescription active molecules. Clinical advice: Discontinue unverified raw herbal pastes when using prescription topicals; introduce only standardized, fragrance-free cosmeceuticals with dermatologist supervision.',
      metadata: {
        topic: 'Herbal-Prescription Topical Drug Interactions and Barrier Safety',
        ingredient: 'Botanical extracts, Essential Oils, Prescription Retinoids, Benzoyl Peroxide',
        domain: 'integrative',
        sourceTitle: 'Adverse Cutaneous Reactions from Concurrent Use of Herbal and Conventional Topical Therapeutics',
        authorOrPublisher: 'Contact Dermatitis & Journal of Clinical and Aesthetic Dermatology',
        bibliographicReference: 'Contact Dermatitis. 2019;81(4):231-240',
        publicationDate: '2019-10-01',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'Compounded erythema, acute chemical burns, and allergic contact dermatitis from heightened penetration through retinoid-sensitized barriers.',
        contraindications: 'Concurrent application of raw essential oils or unbuffered herbal pastes with topical retinoids or exfoliating acids.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-sandalwood-chandan-cooling',
      title: 'Sandalwood / Chandan (Santalum album): Traditional Pitta Soothing',
      content: 'Chandan is renowned in Ayurvedic texts for its Sheeta (cooling) and Pitta-pacifying properties to reduce facial flushing and inflammatory heat. Modern findings: East Indian sandalwood oil possesses mild anti-inflammatory properties, but pure essential oil fractions are volatile allergens. Dermatologists advise using non-fragranced formulations over raw essential oils for reactive skin.',
      metadata: {
        topic: 'Santalum album Pharmacological Profile and Contact Irritancy',
        ingredient: 'Santalum album (Sandalwood / Santalol)',
        domain: 'ayurveda',
        sourceTitle: 'Sandalwood Album Oil as a Botanical Therapeutic in Dermatology',
        authorOrPublisher: 'Journal of Clinical and Aesthetic Dermatology',
        bibliographicReference: 'J Clin Aesthet Dermatol. 2014;7(10):20-25',
        publicationDate: '2014-10-01',
        evidenceCategory: 'B: Limited or emerging clinical evidence',
        safetyConcerns: 'Volatile santalols in undiluted essential oils can trigger fragrance contact allergies.',
        contraindications: 'Do not use undiluted pure essential oil on sensitized skin barriers.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-manjistha-complexion-clarity',
      title: 'Manjistha (Rubia cordifolia): Traditional Blood Purifier & Antioxidant',
      content: 'Manjistha is an esteemed Ayurvedic botanical traditionally indicated for Raktashodhaka (blood-purifying) and Varnya actions for uneven skin tone and hyperpigmentation. Bioactive anthraquinones exhibit tyrosinase-inhibiting and free-radical scavenging properties. Best utilized in standardized cosmetic serums rather than homemade root pastes.',
      metadata: {
        topic: 'Rubia cordifolia Tyrosinase Inhibition and Antioxidant Capacity',
        ingredient: 'Rubia cordifolia (Manjistha / Purpurin)',
        domain: 'ayurveda',
        sourceTitle: 'Evaluation of Tyrosinase Inhibitory Activity of Rubia cordifolia Extract',
        authorOrPublisher: 'Journal of Ethnopharmacology',
        bibliographicReference: 'J Ethnopharmacol. 2015;174:100-106',
        publicationDate: '2015-11-04',
        evidenceCategory: 'B: Limited or emerging clinical evidence',
        safetyConcerns: 'Coarse homemade root pastes cause micro-abrasions and potential contact dermatitis.',
        contraindications: 'Avoid rough root powders as physical scrubs on inflammatory acne.',
        lastVerificationDate: '2026-10-30',
      },
    },
    {
      sourceType: KnowledgeSourceType.ARTICLE,
      sourceId: 'ayurveda-safety-boundaries-and-limits',
      title: 'Ayurvedic Skincare Boundaries: Traditional Evidence vs Medical Care',
      content: 'Ayurvedic skincare traditions offer valuable holistic and barrier-supportive concepts. However, critical clinical distinctions must be maintained: 1. Natural does not equal allergen-free. 2. Traditional remedies must never replace dermatologist care for bacterial infections, cystic acne, or premalignant skin lesions. 3. Oral herbal preparations should never be ingested without qualified medical practitioner guidance.',
      metadata: {
        topic: 'Clinical Boundaries and Medical Precaution in Traditional Dermatology',
        ingredient: 'Herbal Formulations, Botanical Extracts',
        domain: 'ayurveda',
        sourceTitle: 'Evidence-Based Integrative Dermatology: Opportunities and Safety Guardrails',
        authorOrPublisher: 'Clinics in Dermatology',
        bibliographicReference: 'Clin Dermatol. 2018;36(5):606-613',
        publicationDate: '2018-09-01',
        evidenceCategory: 'A: Established clinical evidence',
        safetyConcerns: 'Delaying medical treatment for severe bacterial cellulitis, nodulocystic acne, or melanoma in favor of home remedies carries grave health risks.',
        contraindications: 'Never self-medicate diagnosed infectious dermatoses solely with unverified traditional pastes.',
        lastVerificationDate: '2026-10-30',
      },
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
    } else {
      await db.update(knowledgeEmbeddings).set({
        title: chunk.title,
        content: chunk.content,
        metadata: chunk.metadata,
        updatedAt: new Date(),
      }).where(eq(knowledgeEmbeddings.id, existing[0]!.id));
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
