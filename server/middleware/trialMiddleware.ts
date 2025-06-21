import { Request, Response, NextFunction } from "express";
import { TrialManager } from "../trialManager";

export interface TrialRequest extends Request {
  trialInfo?: any;
}

/**
 * Middleware to check trial status and enforce limits
 */
export const trialMiddleware = async (req: TrialRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.headers["x-organization-id"] as string;
    
    if (!organizationId) {
      return next(); // Skip if no organization context
    }

    const trialInfo = await TrialManager.getTrialInfo(organizationId);
    req.trialInfo = trialInfo;

    // Check if trial is expired and subscription is not active
    if (trialInfo.isExpired && trialInfo.subscriptionStatus === "trial") {
      return res.status(402).json({
        error: "trial_expired",
        message: "Your free trial has expired. Please upgrade to continue using Sortify.",
        trialInfo
      });
    }

    next();
  } catch (error) {
    console.error("Trial middleware error:", error);
    next(); // Continue on error to avoid blocking requests
  }
};

/**
 * Middleware to check specific action limits
 */
export const checkActionLimit = (action: "add_user" | "add_package") => {
  return async (req: TrialRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = req.headers["x-organization-id"] as string;
      
      if (!organizationId) {
        return next();
      }

      const canPerform = await TrialManager.canPerformAction(organizationId, action);
      
      if (!canPerform) {
        const trialInfo = await TrialManager.getTrialInfo(organizationId);
        
        return res.status(402).json({
          error: "limit_exceeded",
          message: `You've reached your ${action.replace("_", " ")} limit. Please upgrade your plan.`,
          trialInfo,
          action
        });
      }

      next();
    } catch (error) {
      console.error(`Action limit check error for ${action}:`, error);
      next();
    }
  };
};