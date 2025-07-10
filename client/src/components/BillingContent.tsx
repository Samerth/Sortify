import { useState } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Users, Package, Zap, Crown, Star } from "lucide-react";

// Plan details to help users understand differences
const planFeatures = {
  starter: {
    name: "Starter",
    price: "$25/license/month",
    description: "Perfect for small teams",
    maxPackages: 1000,
    features: [
      "Pay per license (unlimited users)",
      "1,000 packages/month",
      "Email notifications",
      "Basic analytics",
      "Photo storage"
    ],
    icon: <Users className="w-5 h-5" />
  },
  professional: {
    name: "Professional",
    price: "$35/license/month",
    description: "Great for growing organizations",
    maxPackages: "Unlimited",
    features: [
      "Pay per license (unlimited users)",
      "Unlimited packages",
      "Email & SMS notifications",
      "Advanced analytics",
      "API integrations",
      "Priority support"
    ],
    icon: <Zap className="w-5 h-5" />
  },
  enterprise: {
    name: "Enterprise",
    price: "$45/license/month",
    description: "For large organizations",
    maxPackages: "Unlimited",
    features: [
      "Pay per license (unlimited users)",
      "Unlimited packages",
      "White-label branding",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee"
    ],
    icon: <Crown className="w-5 h-5" />
  }
};

// Custom Pricing Component that bypasses iframe issues
function CustomPricingButtons() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Please select an organization first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(planId);
    
    try {
      const response = await apiRequest("POST", "/api/billing/create-checkout-session", {
        planId,
        customerEmail: user?.email || '',
      });
      
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const plans = [
    { id: 'starter', name: 'Starter - $25/month', recommended: false },
    { id: 'professional', name: 'Professional - $35/month', recommended: true },
    { id: 'enterprise', name: 'Enterprise - $45/month', recommended: false }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <Button
          key={plan.id}
          variant={plan.recommended ? "default" : "outline"}
          onClick={() => handleSubscribe(plan.id)}
          disabled={isLoading !== null}
          className={`h-16 ${plan.recommended ? 'ring-2 ring-primary' : ''}`}
        >
          {isLoading === plan.id ? "Processing..." : `Subscribe to ${plan.name}`}
          {plan.recommended && <Badge className="ml-2">Popular</Badge>}
        </Button>
      ))}
    </div>
  );
}

export default function BillingContent() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [isManaging, setIsManaging] = useState(false);

  const handleManageSubscription = async () => {
    if (!currentOrganization?.stripeCustomerId) {
      toast({
        title: "No Active Subscription",
        description: "Subscribe to a plan first to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    setIsManaging(true);
    try {
      const response = await apiRequest("POST", "/api/billing/create-portal-session", {
        customerId: currentOrganization.stripeCustomerId,
      });
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management portal.",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing & Subscriptions</h2>
          <p className="text-gray-600">
            License-based pricing with unlimited users per license
          </p>
        </div>
        {currentOrganization?.planType && (
          <Badge variant="secondary" className="text-sm">
            Current: {currentOrganization.planType}
          </Badge>
        )}
      </div>

      {/* Plan comparison section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(planFeatures).map(([key, plan]) => (
          <Card key={key} className="border-2 hover:border-blue-200 transition-colors h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {plan.icon}
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </div>
              <div className="text-xl font-bold text-blue-600 break-words">{plan.price}</div>
              <p className="text-sm text-gray-600">{plan.description}</p>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm">
                    {typeof plan.maxPackages === 'number' ? `${plan.maxPackages}` : plan.maxPackages} packages/month
                  </span>
                </div>
              </div>
              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribe to Your Plan</CardTitle>
          <p className="text-sm text-gray-600">
            Choose your license plan below. Each plan includes unlimited users per license with automated monthly billing.
          </p>
        </CardHeader>
        <CardContent>
          <CustomPricingButtons />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            After subscribing, manage your subscription, update payment methods, 
            and view billing history through Stripe's customer portal.
          </p>
          
          <Button 
            variant="outline" 
            onClick={handleManageSubscription}
            disabled={isManaging}
          >
            {isManaging ? "Loading..." : "Manage Subscription"}
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Star className="w-4 h-4" />
            <span>All plans include automated recurring billing and instant activation</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}