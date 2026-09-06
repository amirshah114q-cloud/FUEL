import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    });
  }
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password change attempts. Please try again later.'
    });
  }
});

router.post('/login', loginLimiter, validateBody(loginSchema), asyncHandler(authController.login));
router.get('/me', requireAuth, asyncHandler(authController.getMe));
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.put(
  '/change-password',
  requireAuth,
  passwordChangeLimiter,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

export default router;