import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Package, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Crown,
  Calendar as CalendarIcon,
  DollarSign,
  Shield,
  Clock,
  Zap,
  Star,
  Download
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface BillingInfo {
  organization: {
    id: string;
    name: string;
    planType: string;
    subscriptionStatus: string;
    billingEmail: string;
    billingCycle: string;
    maxUsers: number;
    maxPackagesPerMonth: number;
    currentMonthPackages: number;
    nextBillingDate: string;
    lastPaymentDate: string;
    lastPaymentAmount: number;
    trialEndDate: string;
    stripeCustomerId: string;
  };
  trialInfo: {
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
  };
  currentUsers: number;
}

interface PlanInfo {
  name: string;
  pricePerUser: number;
  minUsers: number;
  maxUsers: number;
  maxPackages: number;
  features: string[];
}

const planDetails: Record<string, PlanInfo> = {
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
    minUsers: 3,
    maxUsers: 25,
    maxPackages: 1000,
    features: ["Up to 25 users", "1,000 packages/month", "Email notifications", "Basic analytics", "Photo storage"]
  },
  professional: {
    name: "Professional",
    pricePerUser: 35,
    minUsers: 5,
    maxUsers: 100,
    maxPackages: -1,
    features: ["Up to 100 users", "Unlimited packages", "Email & SMS notifications", "Advanced analytics", "API integrations", "Priority support"]
  },
  enterprise: {
    name: "Enterprise",
    pricePerUser: 45,
    minUsers: 10,
    maxUsers: -1,
    maxPackages: -1,
    features: ["Unlimited users", "Unlimited packages", "White-label branding", "Custom integrations", "Dedicated support", "SLA guarantee"]
  }
};

export default function BillingSettings() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [userCount, setUserCount] = useState(3);

  const { data: billingInfo, isLoading } = useQuery<BillingInfo>({
    queryKey: ["/api/billing/info", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/billing/info", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch billing info");
      return response.json();
    },
  });

  const upgradePlanMutation = useMutation({
    mutationFn: async (data: { planType: string; userCount: number; billingCycle: string }) => {
      return apiRequest("/api/billing/upgrade", {
        method: "POST",
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Plan Upgrade Initiated",
        description: "You'll be redirected to complete payment setup.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
      setIsUpgradeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBillingInfoMutation = useMutation({
    mutationFn: async (data: { billingEmail: string }) => {
      return apiRequest("/api/billing/update", {
        method: "PATCH",
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Billing Information Updated",
        description: "Your billing details have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update billing information.",
        variant: "destructive",
      });
    },
  });

  if (!currentOrganization) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to continue.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const currentPlan = planDetails[billingInfo?.organization.planType || "trial"];
  const isTrialUser = billingInfo?.organization.subscriptionStatus === "trial";
  const isPaidUser = billingInfo?.organization.subscriptionStatus === "active";
  const isExpired = billingInfo?.trialInfo.isExpired;

  const usagePercentage = billingInfo?.trialInfo.usageLimits.maxPackagesPerMonth > 0
    ? (billingInfo.trialInfo.usageLimits.currentPackages / billingInfo.trialInfo.usageLimits.maxPackagesPerMonth) * 100
    : 0;

  const handleUpgrade = () => {
    const planInfo = planDetails[selectedPlan];
    upgradePlanMutation.mutate({
      planType: selectedPlan,
      userCount: Math.max(userCount, planInfo.minUsers),
      billingCycle: "monthly"
    });
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-600">Manage your subscription, billing, and usage</p>
          </div>
          {(isTrialUser || isExpired) && (
            <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-dark">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Current Plan Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isTrialUser ? "bg-blue-100" : 
                  isPaidUser ? "bg-green-100" : "bg-red-100"
                }`}>
                  {isTrialUser ? (
                    <Clock className="w-5 h-5 text-blue-600" />
                  ) : isPaidUser ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">{currentPlan.name}</CardTitle>
                  <p className="text-gray-600">
                    {isTrialUser && billingInfo?.trialInfo.daysRemaining > 0 
                      ? `${billingInfo.trialInfo.daysRemaining} days remaining`
                      : isExpired 
                      ? "Trial expired - Upgrade required"
                      : "Active subscription"
                    }
                  </p>
                </div>
              </div>
              <Badge 
                variant={
                  isTrialUser ? "default" : 
                  isPaidUser ? "secondary" : "destructive"
                }
                className={
                  isTrialUser ? "bg-blue-100 text-blue-800" :
                  isPaidUser ? "bg-green-100 text-green-800" : 
                  "bg-red-100 text-red-800"
                }
              >
                {billingInfo?.organization.subscriptionStatus.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Users</p>
                  <p className="font-semibold">
                    {billingInfo?.currentUsers || 0} / {billingInfo?.trialInfo.usageLimits.maxUsers === -1 ? "∞" : billingInfo?.trialInfo.usageLimits.maxUsers}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Packages This Month</p>
                  <p className="font-semibold">
                    {billingInfo?.trialInfo.usageLimits.currentPackages || 0} / {billingInfo?.trialInfo.usageLimits.maxPackagesPerMonth === -1 ? "∞" : billingInfo?.trialInfo.usageLimits.maxPackagesPerMonth}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Monthly Cost</p>
                  <p className="font-semibold">
                    {isTrialUser ? "$0" : `$${(currentPlan.pricePerUser * (billingInfo?.currentUsers || 1)).toFixed(2)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">
                    {isTrialUser ? "Trial Ends" : "Next Billing"}
                  </p>
                  <p className="font-semibold">
                    {isTrialUser && billingInfo?.organization.trialEndDate
                      ? format(new Date(billingInfo.organization.trialEndDate), "MMM dd, yyyy")
                      : billingInfo?.organization.nextBillingDate
                      ? format(new Date(billingInfo.organization.nextBillingDate), "MMM dd, yyyy")
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Progress */}
            {billingInfo?.trialInfo.usageLimits.maxPackagesPerMonth > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Package Usage</Label>
                  <span className="text-sm text-gray-600">
                    {usagePercentage.toFixed(1)}% used
                  </span>
                </div>
                <Progress 
                  value={usagePercentage} 
                  className={`h-2 ${usagePercentage > 90 ? "bg-red-100" : usagePercentage > 75 ? "bg-yellow-100" : "bg-green-100"}`}
                />
                {usagePercentage > 90 && (
                  <p className="text-sm text-red-600 mt-1">
                    You're approaching your monthly package limit. Consider upgrading for unlimited packages.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Current Plan Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        {isPaidUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingEmail">Billing Email</Label>
                  <Input
                    id="billingEmail"
                    type="email"
                    defaultValue={billingInfo?.organization.billingEmail || ""}
                    placeholder="billing@company.com"
                    onBlur={(e) => {
                      if (e.target.value !== billingInfo?.organization.billingEmail) {
                        updateBillingInfoMutation.mutate({ billingEmail: e.target.value });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Billing Cycle</Label>
                  <p className="font-medium capitalize">{billingInfo?.organization.billingCycle || "monthly"}</p>
                </div>
              </div>

              {billingInfo?.organization.lastPaymentDate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Last Payment</h4>
                  <div className="flex justify-between text-sm">
                    <span>Date: {format(new Date(billingInfo.organization.lastPaymentDate), "MMM dd, yyyy")}</span>
                    <span>Amount: ${(billingInfo.organization.lastPaymentAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Invoice
                </Button>
                <Button variant="outline">
                  Update Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        {(isTrialUser || isExpired) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Available Plans
              </CardTitle>
              <p className="text-gray-600">Choose the plan that fits your organization's needs</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(planDetails).filter(([key]) => key !== "trial").map(([key, plan]) => (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPlan === key 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPlan(key)}
                  >
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <div className="text-2xl font-bold text-primary">
                        ${plan.pricePerUser}
                        <span className="text-sm text-gray-600">/user/month</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {plan.minUsers} - {plan.maxUsers === -1 ? "∞" : plan.maxUsers} users
                      </p>
                    </div>
                    <div className="space-y-2">
                      {plan.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="userCount">Number of Users</Label>
                    <Input
                      id="userCount"
                      type="number"
                      value={userCount}
                      onChange={(e) => setUserCount(Number(e.target.value))}
                      min={planDetails[selectedPlan]?.minUsers || 1}
                      max={planDetails[selectedPlan]?.maxUsers === -1 ? 1000 : planDetails[selectedPlan]?.maxUsers}
                      className="w-24 mt-1"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Monthly Total</p>
                    <p className="text-2xl font-bold text-primary">
                      ${(planDetails[selectedPlan]?.pricePerUser * userCount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleUpgrade}
                  disabled={upgradePlanMutation.isPending}
                  className="w-full mt-4"
                >
                  {upgradePlanMutation.isPending ? "Processing..." : "Upgrade Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upgrade Dialog for Header Button */}
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(planDetails).filter(([key]) => key !== "trial").map(([key, plan]) => (
            <div
              key={key}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPlan === key 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="text-2xl font-bold text-primary">
                  ${plan.pricePerUser}
                  <span className="text-sm text-gray-600">/user/month</span>
                </div>
              </div>
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label htmlFor="userCount">Number of Users</Label>
              <Input
                id="userCount"
                type="number"
                value={userCount}
                onChange={(e) => setUserCount(Number(e.target.value))}
                min={planDetails[selectedPlan]?.minUsers || 1}
                max={planDetails[selectedPlan]?.maxUsers === -1 ? 1000 : planDetails[selectedPlan]?.maxUsers}
                className="w-24 mt-1"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Monthly Total</p>
              <p className="text-2xl font-bold text-primary">
                ${(planDetails[selectedPlan]?.pricePerUser * userCount || 0).toFixed(2)}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            disabled={upgradePlanMutation.isPending}
            className="w-full"
          >
            {upgradePlanMutation.isPending ? "Processing..." : "Upgrade Now"}
          </Button>
        </div>
      </DialogContent>
    </>
  );
}