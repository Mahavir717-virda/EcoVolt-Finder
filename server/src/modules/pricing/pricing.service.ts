import { ConnectorType } from '@prisma/client';
import { prisma } from '../../db/client';
import { NotFoundError, BadRequestError } from '../../middleware/error-handler';
import { QuoteQuery, UpdatePricingRuleInput } from './pricing.schema';

export interface PriceQuoteResponse {
  stationId: string;
  connectorType: ConnectorType;
  baseTariff: number;
  providerMarkup: number;
  touAdjustment: number;
  finalPrice: number;
  isEstimate: boolean;
  currency: 'INR';
  validUntil: string;
}

export class PricingService {
  /**
   * Compute a locked price quote for a station connector
   */
  public static async computeQuote(params: {
    stationId: string;
    connectorType: ConnectorType;
    kwh?: number;
    at?: Date;
    renewablePctOverride?: number;
  }): Promise<PriceQuoteResponse> {
    const { stationId, connectorType, at = new Date(), renewablePctOverride } = params;

    // 1. Fetch station with operator, pricing rules, and zone tariffs
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        pricingRules: true,
        connectors: true,
        zone: {
          include: {
            tariffs: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundError(`Station not found with id: ${stationId}`);
    }

    // Verify connector exists at station
    const connector = station.connectors.find((c) => c.type === connectorType);
    if (!connector) {
      throw new NotFoundError(
        `Connector ${connectorType} is not available at station ${station.name}`
      );
    }

    // 2. Resolve base tariff (Edge Case #2)
    const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
    const baseTariff = tariff ? tariff.baseRate : 13.0;

    // 3. Resolve manager markup (Edge Case #24)
    const specificRule = station.pricingRules.find(pr => pr.connectorId === connector.id);
    const stationRule = station.pricingRules.find(pr => pr.connectorId === null);
    const pricingRule = specificRule || stationRule;
    
    const providerMarkup = pricingRule ? pricingRule.providerMarkup : 2.5;
    const enableDynamicDiscount = pricingRule ? pricingRule.enableDynamicDiscount : true;
    const discountMaxKwh = pricingRule ? pricingRule.discountMaxKwh : 3.0;

    // 4. Resolve ToU Adjustment & Estimate status (Edge Cases #5, #14)
    let touAdjustment = 0;
    let isEstimate = false;

    // Check if published ToU slabs exist in tariff
    const slabs = tariff?.touSlabs as Record<string, number> | null;
    const hourLocal = (at.getUTCHours() + 5 + Math.floor((at.getUTCMinutes() + 30) / 60)) % 24; // IST hour

    if (slabs && typeof slabs === 'object') {
      // Published ToU slabs (e.g. { peak: 16.0, normal: 13.5, offPeak: 10.5 })
      // Daytime solar off-peak: 11:00 - 15:00 IST
      // Evening peak: 18:00 - 22:00 IST
      if (hourLocal >= 18 && hourLocal <= 22 && slabs.peak) {
        touAdjustment = Math.round((slabs.peak - baseTariff) * 100) / 100;
      } else if (hourLocal >= 11 && hourLocal <= 15 && slabs.offPeak) {
        touAdjustment = Math.round((slabs.offPeak - baseTariff) * 100) / 100;
      } else {
        touAdjustment = 0.0;
      }
      isEstimate = false;
    } else if (enableDynamicDiscount) {
      // Modelled Proxy Discount based on renewable % (Edge Case #14)
      const renewablePct = renewablePctOverride ?? (hourLocal >= 10 && hourLocal <= 16 ? 75 : 40);
      const k = 0.25; // max 25% discount factor
      const rawDiscount = -((renewablePct / 100) * k * baseTariff);
      
      // Clamp to discountMaxKwh
      touAdjustment = Math.max(-discountMaxKwh, Math.round(rawDiscount * 100) / 100);
      isEstimate = true;
    }

    // 5. Price Floor Clamping (Edge Case #14: price never drops below 60% of base tariff)
    const priceFloor = Math.round(baseTariff * 0.6 * 100) / 100;
    const rawFinalPrice = baseTariff + providerMarkup + touAdjustment;
    const finalPrice = Math.max(priceFloor, Math.round(rawFinalPrice * 100) / 100);

    // 6. Price Lock Expiry (Edge Case #17: 30 minutes lock window)
    const validUntil = new Date(at.getTime() + 30 * 60 * 1000).toISOString();

    return {
      stationId,
      connectorType,
      baseTariff,
      providerMarkup,
      touAdjustment,
      finalPrice,
      isEstimate,
      currency: 'INR',
      validUntil,
    };
  }

  /**
   * Update station pricing rule (Manager only)
   */
  public static async updatePricingRule(stationId: string, input: UpdatePricingRuleInput) {
    const existing = await prisma.pricingRule.findFirst({
      where: { 
        stationId,
        connectorId: input.connectorId || null
      },
    });

    if (existing) {
      return prisma.pricingRule.update({
        where: { id: existing.id },
        data: {
          ...(input.providerMarkup !== undefined ? { providerMarkup: input.providerMarkup } : {}),
          ...(input.enableDynamicDiscount !== undefined
            ? { enableDynamicDiscount: input.enableDynamicDiscount }
            : {}),
          ...(input.discountMaxKwh !== undefined ? { discountMaxKwh: input.discountMaxKwh } : {}),
        },
      });
    }

    return prisma.pricingRule.create({
      data: {
        stationId,
        connectorId: input.connectorId || null,
        providerMarkup: input.providerMarkup ?? 2.5,
        enableDynamicDiscount: input.enableDynamicDiscount ?? true,
        discountMaxKwh: input.discountMaxKwh ?? 3.0,
      },
    });
  }
}
