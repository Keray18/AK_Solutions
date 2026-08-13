import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../shared/types/errors.js';

/**
 * Validate request body, query, or params against a Zod schema.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema, 'body'), controller.create);
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }
      next(new ValidationError(details));
      return;
    }

    // Replace with parsed/coerced values
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true
    });
    next();
  };
}
