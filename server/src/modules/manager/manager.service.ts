import { prisma } from '../../db/client';
import { NotFoundError, BadRequestError } from '../../middleware/error-handler';
import { Prisma } from '@prisma/client';

export class ManagerService {
  /**
   * Get Manager Profile (Operator details)
   */
  public static async getProfile(userId: string) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
    });

    if (!operator) {
      throw new NotFoundError('Manager profile not found');
    }

    return operator;
  }

  /**
   * Update Manager Profile
   */
  public static async updateProfile(userId: string, data: any) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
    });

    if (!operator) {
      throw new NotFoundError('Manager profile not found');
    }

    // Only allow updating specific fields
    const updateData: Prisma.OperatorUpdateInput = {};
    
    if (data.name) updateData.name = data.name;
    if (data.supportEmail) updateData.contactEmail = data.supportEmail;
    
    // JSON fields
    if (data.payoutBankDetails) {
      updateData.payoutBankDetails = data.payoutBankDetails;
    }
    if (data.notificationPrefs) {
      updateData.notificationPrefs = data.notificationPrefs;
    }

    return prisma.operator.update({
      where: { id: operator.id },
      data: updateData,
    });
  }
}
