import { db } from '../../config/database.js';
import { products } from '../../db/schema/products.js';
import { eq, and, not, or, isNull, lte } from 'drizzle-orm';
import { BudgetFlexibility } from '../../shared/types/enums.js';

export interface FilterOptions {
  category?: string;
  maxPrice?: number;
  budgetFlexibility?: string;
  excludeProductId?: string;
  requiredMarket?: string;
}

export class CandidateFilter {
  static async getBaseCandidates(options: FilterOptions) {
    const conditions = [
      eq(products.available, true),
      isNull(products.deletedAt),
    ];

    if (options.category) {
      conditions.push(eq(products.category, options.category as any));
    }

    if (options.excludeProductId) {
      conditions.push(not(eq(products.id, options.excludeProductId)));
    }

    if (options.maxPrice && options.budgetFlexibility === BudgetFlexibility.STRICT) {
      // Hard exclusion for strict budget (> 20% over is excluded at SQL layer)
      const budgetCondition = or(
        isNull(products.price),
        lte(products.price, (options.maxPrice * 1.2).toString())
      );
      if (budgetCondition) conditions.push(budgetCondition);
    }

    if (options.requiredMarket) {
      const marketCondition = or(
        isNull(products.country),
        eq(products.country, options.requiredMarket)
      );
      if (marketCondition) conditions.push(marketCondition);
    }

    const baseCandidates = await db.select().from(products).where(and(...conditions));
    return baseCandidates;
  }
}
