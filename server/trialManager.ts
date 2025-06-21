import { db } from "./db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  planType: string;
  subscriptionStatus: string;
  usageLimits: {
    maxUsers: number;
    maxPackagesPerMonth: number;
    currentPackages: number;
    canAddUsers: boolean;
    canAddPackages: boolean;
  };
}

export class TrialManager {
  /**
   * Initialize trial for new organization
   */
  static async initializeTrial(organizationId: string): Promise<void> {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    await db
      .update(organizations)
      .set({
        planType: "trial",
        subscriptionStatus: "trial",
        trialStartDate: new Date(),
        trialEndDate: trialEndDate,
        maxUsers: 5,
        maxPackagesPerMonth: 500,
        currentMonthPackages: 0,
        usageResetDate: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  /**
   * Get trial and subscription information
   */
  static async getTrialInfo(organizationId: string): Promise<TrialInfo> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      throw new Error("Organization not found");
    }

    const now = new Date();
    const trialEndDate = org.trialEndDate ? new Date(org.trialEndDate) : null;
    const isTrialActive = org.subscriptionStatus === "trial" && trialEndDate && now < trialEndDate;
    const daysRemaining = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isExpired = org.subscriptionStatus === "trial" && trialEndDate && now > trialEndDate;

    // Check if usage reset is needed (monthly)
    const usageResetDate = org.usageResetDate ? new Date(org.usageResetDate) : new Date();
    const shouldResetUsage = now.getMonth() !== usageResetDate.getMonth() || now.getFullYear() !== usageResetDate.getFullYear();

    if (shouldResetUsage) {
      await this.resetMonthlyUsage(organizationId);
    }

    const currentUsers = await this.getCurrentUserCount(organizationId);
    const canAddUsers = currentUsers < (org.maxUsers || 5);
    const canAddPackages = (org.currentMonthPackages || 0) < (org.maxPackagesPerMonth || 500);

    return {
      isTrialActive,
      daysRemaining,
      isExpired,
      planType: org.planType || "trial",
      subscriptionStatus: org.subscriptionStatus || "trial",
      usageLimits: {
        maxUsers: org.maxUsers || 5,
        maxPackagesPerMonth: org.maxPackagesPerMonth || 500,
        currentPackages: org.currentMonthPackages || 0,
        canAddUsers,
        canAddPackages,
      },
    };
  }

  /**
   * Check if organization can perform action
   */
  static async canPerformAction(organizationId: string, action: "add_user" | "add_package"): Promise<boolean> {
    const trialInfo = await this.getTrialInfo(organizationId);

    // Expired trial cannot do anything
    if (trialInfo.isExpired && trialInfo.subscriptionStatus === "trial") {
      return false;
    }

    // Check specific limits
    if (action === "add_user") {
      return trialInfo.usageLimits.canAddUsers;
    }

    if (action === "add_package") {
      return trialInfo.usageLimits.canAddPackages;
    }

    return false;
  }

  /**
   * Increment package usage
   */
  static async incrementPackageUsage(organizationId: string): Promise<void> {
    await db
      .update(organizations)
      .set({
        currentMonthPackages: db.raw("current_month_packages + 1"),
      } as any)
      .where(eq(organizations.id, organizationId));
  }

  /**
   * Reset monthly usage counter
   */
  static async resetMonthlyUsage(organizationId: string): Promise<void> {
    await db
      .update(organizations)
      .set({
        currentMonthPackages: 0,
        usageResetDate: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  /**
   * Get current user count for organization
   */
  private static async getCurrentUserCount(organizationId: string): Promise<number> {
    const result = await db.raw(`
      SELECT COUNT(*) as count 
      FROM organization_members 
      WHERE organization_id = $1
    `, [organizationId]);
    
    return parseInt(result.rows[0]?.count || "0");
  }

  /**
   * Upgrade organization to paid plan
   */
  static async upgradeToPaidPlan(
    organizationId: string,
    planType: "starter" | "professional" | "enterprise",
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<void> {
    const planLimits = {
      starter: { maxUsers: 25, maxPackagesPerMonth: 2000 },
      professional: { maxUsers: 100, maxPackagesPerMonth: -1 }, // unlimited
      enterprise: { maxUsers: -1, maxPackagesPerMonth: -1 }, // unlimited
    };

    const limits = planLimits[planType];

    await db
      .update(organizations)
      .set({
        planType,
        subscriptionStatus: "active",
        maxUsers: limits.maxUsers,
        maxPackagesPerMonth: limits.maxPackagesPerMonth,
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  /**
   * Get plan pricing information
   */
  static getPlanPricing() {
    return {
      trial: {
        name: "7-Day Free Trial",
        price: 0,
        maxUsers: 5,
        maxPackages: 500,
        features: ["Email notifications", "Basic analytics", "Photo storage"]
      },
      starter: {
        name: "Starter",
        price: 29,
        maxUsers: 25,
        maxPackages: 2000,
        features: ["Email notifications", "SMS notifications", "Advanced analytics", "API access"]
      },
      professional: {
        name: "Professional",
        price: 79,
        maxUsers: 100,
        maxPackages: "unlimited",
        features: ["All Starter features", "Unlimited packages", "Priority support", "Custom integrations"]
      },
      enterprise: {
        name: "Enterprise",
        price: "custom",
        maxUsers: "unlimited",
        maxPackages: "unlimited",
        features: ["All Professional features", "White-label branding", "Dedicated support", "Custom development"]
      }
    };
  }
}