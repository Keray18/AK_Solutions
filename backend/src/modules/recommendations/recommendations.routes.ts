import { Router, Request, Response, NextFunction } from 'express';
import { authenticate as requireAuth } from '../../middleware/authenticate.js';
import { db } from '../../config/database.js';
import { recommendations, recommendationItems } from '../../db/schema/recommendations.js';
import { eq, desc } from 'drizzle-orm';

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

    const items = await db.select()
      .from(recommendationItems)
      .where(eq(recommendationItems.recommendationId, id as string));

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
