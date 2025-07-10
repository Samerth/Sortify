import { useEffect } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export default function StripePricingTable() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  useEffect(() => {
    // Load Stripe pricing table script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    document.head.appendChild(script);

    return () => {
      // Clean up script on unmount
      document.head.removeChild(script);
    };
  }, []);

  // Pre-fill customer email if available
  const customerEmail = user?.email || currentOrganization?.billingEmail;

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

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pricing-table-container">
            <stripe-pricing-table 
              pricing-table-id="prctbl_1RjMwbR7UUImIKwkhPMOGqOE"
              publishable-key="pk_test_51RgUSrR7UUImIKwk2CJoRc8QfG8PoBJE2hVJSYmCum4WuZDObwoN0PLW569N16QzpEdY3kkw2lPlUD4WwvOSIAsy00yFnx3rmf"
              customer-email={customerEmail}
            />
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
          
          <div className="text-sm text-gray-500">
            <p><strong>Note:</strong> Plans include:</p>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Unlimited mailroom management</li>
              <li>Real-time notifications</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}