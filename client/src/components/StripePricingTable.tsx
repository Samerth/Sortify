import { useEffect } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
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

export default function StripePricingTable() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  useEffect(() => {
    // Load Stripe pricing table script
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      document.head.appendChild(script);
    }
  }, []);

  // Pre-fill customer email if available
  const customerEmail = user?.email || currentOrganization?.billingEmail || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing & Subscriptions</h2>
          <p className="text-gray-600">
            Choose the plan that fits your organization's needs
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
            Click the subscribe button below to start your subscription. All plans include a 7-day free trial.
          </p>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <stripe-pricing-table 
              pricing-table-id="prctbl_1RjMwbR7UUImIKwkhPMOGqOE"
              publishable-key="pk_test_51RgUSrR7UUImIKwk2CJoRc8QfG8PoBJE2hVJSYmCum4WuZDObwoN0PLW569N16QzpEdY3kkw2lPlUD4WwvOSIAsy00yFnx3rmf">
            </stripe-pricing-table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            After subscribing, you can manage your subscription, update payment methods, 
            and view billing history through Stripe's customer portal.
          </p>
          
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Star className="w-4 h-4" />
            <span>All plans include automated recurring billing and instant activation</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}