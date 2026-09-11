import { Request, Response, NextFunction } from 'express';
import { ConnectorType } from '@prisma/client';
import { PricingService } from './pricing.service';
import { quoteQuerySchema, updatePricingRuleSchema } from './pricing.schema';
import { ValidationError } from '../../middleware/error-handler';

export class PricingController {
  public static async getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = quoteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError('Invalid price quote query', parsed.error.format()));
    }

    try {
      const quote = await PricingService.computeQuote({
        stationId: parsed.data.stationId,
        connectorType: parsed.data.connector as ConnectorType,
        kwh: parsed.data.kwh,
        at: parsed.data.at ? new Date(parsed.data.at) : new Date(),
      });

      res.status(200).json(quote);
    } catch (err) {
      next(err);
    }
  }

  public static async updatePricingRule(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const parsed = updatePricingRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid pricing rule data', parsed.error.format()));
    }

    try {
      const rawId = req.params.stationId;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const rule = await PricingService.updatePricingRule(stationId, parsed.data);
      res.status(200).json(rule);
    } catch (err) {
      next(err);
    }
  }
}
