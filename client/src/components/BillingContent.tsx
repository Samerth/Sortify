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
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripeCheckout } from "./StripeCheckout";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

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

export default function BillingContent() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<number>(5);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [stripePaymentData, setStripePaymentData] = useState<any>(null);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);

  const { data: billingInfo, isLoading } = useQuery<BillingInfo>({
    queryKey: ['/api/billing/info'],
    enabled: !!currentOrganization?.id,
  });

  const upgradePlanMutation = useMutation({
    mutationFn: async (data: { planType: string; userCount: number }) => {
      const response = await apiRequest('POST', '/api/billing/upgrade', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      // Store Stripe payment data and show checkout
      setStripePaymentData(data);
      setShowStripeCheckout(true);
      setShowUpgradeDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/billing/cancel-subscription`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/info'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const plans: Record<string, PlanInfo> = {
    starter: {
      name: "Starter",
      pricePerUser: 12,
      minUsers: 5,
      maxUsers: 25,
      maxPackages: 1000,
      features: [
        "Up to 25 users",
        "1,000 packages per month",
        "Basic mail tracking",
        "Email notifications",
        "Standard support"
      ]
    },
    professional: {
      name: "Professional",
      pricePerUser: 18,
      minUsers: 10,
      maxUsers: 100,
      maxPackages: 5000,
      features: [
        "Up to 100 users",
        "5,000 packages per month",
        "Advanced mail tracking",
        "SMS & Email notifications",
        "Priority support",
        "Custom integrations"
      ]
    },
    enterprise: {
      name: "Enterprise",
      pricePerUser: 25,
      minUsers: 25,
      maxUsers: 1000,
      maxPackages: 25000,
      features: [
        "Up to 1,000 users",
        "25,000 packages per month",
        "Full feature access",
        "Dedicated account manager",
        "24/7 support",
        "Custom integrations",
        "Advanced analytics"
      ]
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Unable to load billing information</p>
      </div>
    );
  }

  const usagePercentage = billingInfo?.trialInfo?.usageLimits?.maxPackagesPerMonth 
    ? (billingInfo.trialInfo.usageLimits.currentPackages / billingInfo.trialInfo.usageLimits.maxPackagesPerMonth) * 100
    : 0;

  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast({
        title: "Plan Required",
        description: "Please select a plan to upgrade to.",
        variant: "destructive",
      });
      return;
    }

    upgradePlanMutation.mutate({
      planType: selectedPlan,
      userCount: selectedUsers,
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing preferences</p>
      </div>

      {/* Current Plan Overview */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-600" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {billingInfo.organization.planType === 'trial' ? 'Free Trial' : 
                 billingInfo.organization.planType.charAt(0).toUpperCase() + billingInfo.organization.planType.slice(1)}
              </div>
              <div className="text-sm text-gray-600">
                {billingInfo.trialInfo.isTrialActive ? (
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    {billingInfo.trialInfo.daysRemaining} days remaining
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Active Subscription
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {billingInfo.currentUsers} Users
              </div>
              <div className="text-sm text-gray-600">
                {billingInfo.trialInfo.usageLimits.canAddUsers ? (
                  `Limit: ${billingInfo.trialInfo.usageLimits.maxUsers}`
                ) : (
                  <div className="flex items-center justify-center gap-1 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    At user limit
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {billingInfo?.trialInfo?.usageLimits?.currentPackages || 0} Packages
              </div>
              <div className="text-sm text-gray-600">
                {billingInfo?.trialInfo?.usageLimits?.canAddPackages ? (
                  `This month`
                ) : (
                  <div className="flex items-center justify-center gap-1 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    At monthly limit
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">
                  Status: {billingInfo.trialInfo.isTrialActive ? (
                    billingInfo.trialInfo.isExpired ? 
                      <span className="text-red-600">Trial Expired</span> : 
                      <span className="text-green-600">Trial Active</span>
                  ) : (
                    <span className="text-green-600">Subscription Active</span>
                  )}
                </span>
              </div>
              <div className="text-gray-600">
                {billingInfo.trialInfo.isTrialActive ? (
                  billingInfo.trialInfo.isExpired ? 
                    "Please upgrade to continue using the service" :
                    `Trial ends ${format(new Date(billingInfo.organization.trialEndDate || ''), 'MMM dd, yyyy')}`
                ) : (
                  billingInfo.organization.nextBillingDate ? 
                    `Next billing: ${format(new Date(billingInfo.organization.nextBillingDate), 'MMM dd, yyyy')}` :
                    "Active subscription"
                )}
              </div>
            </div>
          </div>

          {/* Usage Progress */}
          {billingInfo?.trialInfo?.usageLimits?.maxPackagesPerMonth && billingInfo?.trialInfo?.usageLimits?.maxPackagesPerMonth > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Package Usage</Label>
                <span className="text-sm text-gray-600">
                  {usagePercentage.toFixed(1)}% used
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className="h-2"
              />
              <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                <span>0</span>
                <span>{billingInfo?.trialInfo?.usageLimits?.maxPackagesPerMonth || 0} packages/month</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(plans).map(([key, plan]) => (
            <Card 
              key={key} 
              className={`relative transition-all hover:shadow-lg ${
                key === 'professional' ? 'border-blue-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {key === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-center">
                  <div className="text-xl font-bold text-gray-900">{plan.name}</div>
                  <div className="text-3xl font-bold text-blue-600 mt-2">
                    ${plan.pricePerUser}
                    <span className="text-sm text-gray-500 font-normal">/user/month</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">
                      {plan.minUsers} - {plan.maxUsers} users
                    </div>
                    <div className="text-sm text-gray-600">
                      Up to {plan.maxPackages.toLocaleString()} packages/month
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full"
                      variant={key === 'professional' ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedPlan(key);
                        setSelectedUsers(plan.minUsers);
                        setShowUpgradeDialog(true);
                      }}
                      disabled={billingInfo.organization.planType === key}
                    >
                      {billingInfo.organization.planType === key ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {billingInfo.organization.planType === 'trial' ? 'Start Plan' : 'Upgrade'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {!billingInfo.trialInfo.isTrialActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingInfo.organization.lastPaymentDate && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Payment Successful</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(billingInfo.organization.lastPaymentDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${billingInfo.organization.lastPaymentAmount}</div>
                    <div className="text-sm text-gray-600">
                      <Download className="w-4 h-4 inline mr-1" />
                      Download Receipt
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center text-gray-500 py-4">
                <p>Complete billing history will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan && plans[selectedPlan]?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="users">Number of Users</Label>
              <Select value={selectedUsers.toString()} onValueChange={(value) => setSelectedUsers(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlan && Array.from(
                    { length: plans[selectedPlan].maxUsers - plans[selectedPlan].minUsers + 1 },
                    (_, i) => plans[selectedPlan].minUsers + i
                  ).map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} users
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Monthly Total:</span>
                <span className="text-xl font-bold text-blue-600">
                  ${selectedPlan ? (plans[selectedPlan].pricePerUser * selectedUsers).toLocaleString() : 0}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {selectedUsers} users × ${selectedPlan ? plans[selectedPlan].pricePerUser : 0}/user
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowUpgradeDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpgrade}
                disabled={upgradePlanMutation.isPending}
                className="flex-1"
              >
                {upgradePlanMutation.isPending ? "Processing..." : "Upgrade Now"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Checkout Dialog */}
      <Dialog open={showStripeCheckout} onOpenChange={setShowStripeCheckout}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          {stripePaymentData && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret: stripePaymentData.clientSecret,
                appearance: { theme: 'stripe' }
              }}
            >
              <StripeCheckout
                planType={stripePaymentData.planType}
                userCount={stripePaymentData.userCount}
                totalAmount={stripePaymentData.totalAmount}
                paymentIntentId={stripePaymentData.paymentIntentId}
                organizationId={currentOrganization?.id || ''}
                onSuccess={() => {
                  setShowStripeCheckout(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/billing/info'] });
                  toast({
                    title: "Payment Successful",
                    description: "Your subscription has been upgraded successfully!",
                  });
                }}
                onCancel={() => setShowStripeCheckout(false)}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}