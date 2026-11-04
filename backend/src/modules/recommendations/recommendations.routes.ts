import { Router, Request, Response, NextFunction } from 'express';
import { authenticate as requireAuth } from '../../middleware/authenticate.js';
import { db } from '../../config/database.js';
import { recommendations, recommendationItems } from '../../db/schema/recommendations.js';
import { products, brands } from '../../db/schema/products.js';
import { ingredients, productIngredients } from '../../db/schema/ingredients.js';
import { eq, desc, inArray } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/recommendations
 * Gets the current user's recommendation history
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const recs = await db.select()
      .from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(desc(recommendations.createdAt));
      
    res.json({
      status: 'success',
      data: recs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recommendations/:id
 * Gets a specific recommendation detail
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const recoArray = await db.select()
      .from(recommendations)
      .where(eq(recommendations.id, id as string));

    if (!recoArray.length) {
      res.status(404).json({ status: 'error', message: 'Recommendation not found' });
      return;
    }
    const reco = recoArray[0];

    // IDOR check
    if (reco?.userId !== userId) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }

    const rawItems = await db
      .select({
        item: recommendationItems,
        product: products,
        brand: brands,
      })
      .from(recommendationItems)
      .leftJoin(products, eq(recommendationItems.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(recommendationItems.recommendationId, id as string))
      .orderBy(recommendationItems.rank);

    const productIds = rawItems.map(r => r.product?.id).filter(Boolean) as string[];
    const ingredientMap = new Map<string, any[]>();
    if (productIds.length > 0) {
      const pIngredients = await db
        .select({
          productId: productIngredients.productId,
          inciName: ingredients.inciName,
          commonName: ingredients.commonName,
          category: ingredients.category,
          isKey: productIngredients.isKeyIngredient,
        })
        .from(productIngredients)
        .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
        .where(inArray(productIngredients.productId, productIds))
        .orderBy(productIngredients.position);

      for (const pi of pIngredients) {
        if (!ingredientMap.has(pi.productId)) {
          ingredientMap.set(pi.productId, []);
        }
        ingredientMap.get(pi.productId)!.push(pi);
      }
    }

    const items = rawItems.map(r => ({
      ...r.item,
      product: r.product ? {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        category: r.product.category,
        description: r.product.description,
        price: r.product.price,
        currency: r.product.currency,
        size: r.product.size,
        imageUrl: r.product.imageUrl,
        skinTypeSuitability: r.product.skinTypeSuitability,
        concernSuitability: r.product.concernSuitability,
        hasFragrance: r.product.hasFragrance,
        brand: r.brand ? {
          id: r.brand.id,
          name: r.brand.name,
          slug: r.brand.slug,
          website: r.brand.website,
        } : null,
        ingredients: ingredientMap.get(r.product.id) || [],
      } : null,
    }));

    res.json({
      status: 'success',
      data: {
        ...reco,
        items
      }
    });
  } catch (error) {
    next(error);
  }
});

import { RecommendationService } from './recommendation.service.js';
import { ContextLoader } from '../routines/engines/contextLoader.js';
import { RecommendationType } from '../../shared/types/enums.js';

/**
 * POST /api/recommendations/generate
 * Generates personalized recommendations based on the user's profile and routines
 */
router.post('/generate', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const fullContext = await ContextLoader.load(userId);

    const concerns = fullContext.skinProfile?.concerns || [];
    const primaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'primary')
      .map(c => c.type.toString());
    const secondaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'secondary')
      .map(c => c.type.toString());

    const context = {
      userId,
      primaryConcerns,
      secondaryConcerns,
      skinType: fullContext.skinProfile?.skinType || undefined,
      sensitivity: fullContext.skinProfile?.sensitivity || undefined,
      existingProductIds: [],
      ownedProductIds: [],
      requestType: RecommendationType.PRODUCT_SUGGESTION
    };

    const targetCategory = req.body?.category;
    const recommendation = await RecommendationService.processDiscovery(context, targetCategory);

    res.status(201).json({
      status: 'success',
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
});

export { router as recommendationRoutes };
