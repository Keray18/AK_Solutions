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

export { router as recommendationRoutes };
