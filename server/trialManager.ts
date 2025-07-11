import { db } from "./db";
import { organizations, organizationMembers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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
        maxUsers: 1,
        maxPackagesPerMonth: 100,
        currentMonthPackages: 0,
        usageResetDate: new Date(),
      })
      .where(eq(organizations.id, organizationId));
  }

  /**
   * Reset organization to trial state (clear subscription data)
   */
  static async resetToTrial(organizationId: string): Promise<void> {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    await db
      .update(organizations)
      .set({
        planType: "trial",
        subscriptionStatus: "trial",
        trialStartDate: new Date(),
        trialEndDate: trialEndDate,
        maxUsers: 1,
        maxPackagesPerMonth: 100,
        currentMonthPackages: 0,
        usageResetDate: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
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
      isTrialActive: !!isTrialActive,
      daysRemaining,
      isExpired: !!isExpired,
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
    const [org] = await db
      .select({ currentMonthPackages: organizations.currentMonthPackages })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    
    await db
      .update(organizations)
      .set({
        currentMonthPackages: (org?.currentMonthPackages || 0) + 1,
      })
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
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return result?.count || 0;
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
      starter: { maxUsers: 3, maxPackagesPerMonth: 1000 },
      professional: { maxUsers: 10, maxPackagesPerMonth: -1 }, // unlimited
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
        pricePerUser: 0,
        minUsers: 1,
        maxUsers: 5,
        maxPackages: 500,
        features: ["Email notifications", "Basic analytics", "Photo storage"]
      },
      starter: {
        name: "Starter",
        pricePerUser: 25,
        minUsers: 1,
        maxUsers: 3,
        maxPackages: 1000,
        features: ["Up to 3 users", "1,000 packages/month", "Email notifications", "Basic analytics", "Photo storage"]
      },
      professional: {
        name: "Professional",
        pricePerUser: 35,
        minUsers: 1,
        maxUsers: 10,
        maxPackages: -1,
        features: ["Up to 10 users", "Unlimited packages", "Email & SMS notifications", "Advanced analytics", "API integrations", "Priority support"]
      },
      enterprise: {
        name: "Enterprise",
        pricePerUser: 45,
        minUsers: 1,
        maxUsers: -1,
        maxPackages: -1,
        features: ["Unlimited users", "Unlimited packages", "White-label branding", "Custom integrations", "Dedicated support", "SLA guarantee"]
      }
    };
  }
}