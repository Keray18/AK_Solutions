import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { corsOptions } from './config/cors.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { sendSuccess } from './shared/utils/apiResponse.js';

const app = express();

// ---- Security ----
app.use(helmet());
app.use(cors(corsOptions));

// ---- Parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ---- Logging ----
app.use(requestLogger);

// ---- Rate Limiting ----
app.use(globalLimiter);

// ---- Health Check ----
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] ?? '1.0.0',
  });
});

// ---- API Routes ----
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import skinProfileRoutes from './modules/skinProfiles/skinProfiles.routes.js';
import onboardingRoutes from './modules/onboarding/onboarding.routes.js';
import brandsRoutes from './modules/brands/brands.routes.js';
import ingredientRoutes from './modules/ingredients/ingredients.routes.js';
import { routineRoutes } from './modules/routines/routines.routes.js';
import productRoutes from './modules/products/products.routes.js';
import interactionRoutes from './modules/interactions/interactions.routes.js';
import { recommendationRoutes } from './modules/recommendations/recommendations.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skin-profile', skinProfileRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/admin/brands', brandsRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationRoutes);
// app.use('/api/saved-products', savedProductRoutes);
// app.use('/api/affiliate', affiliateRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/feedback', feedbackRoutes);
// app.use('/api/waitlist', waitlistRoutes);
// app.use('/api/articles', articleRoutes);
// app.use('/api/admin', adminRoutes);

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ---- Error Handler (must be last) ----
app.use(errorHandler);

export { app };
