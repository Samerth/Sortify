import { useEffect } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown } from "lucide-react";

// Stripe Pricing Table Component for Billing Page
function StripePricingTableComponent() {
  const { user } = useAuth();
  
  useEffect(() => {
    // Load Stripe pricing table script if not already loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      document.head.appendChild(script);
    }
  }, []);

  const customerEmail = user?.email || '';

  return (
    <div id="stripe-pricing-table-billing">
      <stripe-pricing-table 
        pricing-table-id="prctbl_1RjMwbR7UUImIKwkhPMOGqOE"
        publishable-key="pk_test_51RgUSrR7UUImIKwk2CJoRc8QfG8PoBJE2hVJSYmCum4WuZDObwoN0PLW569N16QzpEdY3kkw2lPlUD4WwvOSIAsy00yFnx3rmf"
        customer-email={customerEmail}
      />
    </div>
  );
}

export default function BillingSettings() {
  const { currentOrganization } = useOrganization();

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
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">
              Current: {currentOrganization.planType}
            </span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <p className="text-sm text-gray-600">
            All plans include automated recurring billing through Stripe. You can manage your subscription, update payment methods, and view billing history through the customer portal.
          </p>
        </CardHeader>
        <CardContent>
          <div className="pricing-table-container">
            <StripePricingTableComponent />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}