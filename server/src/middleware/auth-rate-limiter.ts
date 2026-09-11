import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit auth attempts to 30 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_AUTH_ATTEMPTS',
        message: 'Too many authentication attempts from this IP, please try again in 15 minutes',
      },
    });
  },
});
