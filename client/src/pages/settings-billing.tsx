import { useEffect } from "react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
  
  // Force refresh organization data to get latest subscription status
  const { data: refreshedOrg, isLoading } = useQuery({
    queryKey: [`/api/organizations/${currentOrganization?.id}`],
    enabled: !!currentOrganization?.id,
  });

  // Use refreshed organization data if available, otherwise fallback to context
  const organization = refreshedOrg || currentOrganization;
  
  console.log('Billing Debug - currentOrganization:', currentOrganization);
  console.log('Billing Debug - refreshedOrg:', refreshedOrg);
  console.log('Billing Debug - final organization:', organization);
  console.log('Billing Debug - has subscription ID:', !!organization?.stripeSubscriptionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing & Subscriptions</h2>
          <p className="text-gray-600">
            Choose the plan that fits your organization's needs
          </p>
        </div>
        {organization?.stripeSubscriptionId && (
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">
              Current: {organization.planType} Plan
            </span>
          </div>
        )}
      </div>

      {!organization?.stripeSubscriptionId ? (
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscription</CardTitle>
            <p className="text-sm text-gray-600">
              Your subscription is active. Use the manage button below to update payment methods or view billing history.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {organization.planType || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">Current Plan</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {organization.maxUsers === -1 ? 'Unlimited' : organization.maxUsers}
                </p>
                <p className="text-sm text-gray-600">Licensed Users</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {organization.subscriptionStatus || 'Active'}
                </p>
                <p className="text-sm text-gray-600">Status</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Manage your subscription, update payment methods, and view billing history through Stripe's secure customer portal.
              </p>
              <button 
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                onClick={() => {
                  fetch('/api/billing/create-portal-session', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'x-organization-id': organization.id 
                    },
                    body: JSON.stringify({
                      customerId: organization.stripeCustomerId
                    })
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.url) {
                      window.open(data.url, '_blank');
                    } else if (data.message) {
                      alert(data.message);
                    } else {
                      alert(data.error || 'Unable to open customer portal.');
                    }
                  })
                  .catch(error => {
                    console.error('Portal error:', error);
                    alert('Customer portal temporarily unavailable. Please try again later.');
                  });
                }}
              >
                Manage Subscription
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}