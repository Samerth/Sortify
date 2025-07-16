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
        publishable-key={import.meta.env.VITE_STRIPE_PUBLIC_KEY}
        customer-email={customerEmail}
      />
    </div>
  );
}

export default function BillingSettings() {
  const { currentOrganization, refreshOrganization } = useOrganization();
  
  // Use the organization from context - it should include all subscription data
  const organization = currentOrganization;
  
  // Add a refresh button for debugging webhook updates
  const handleRefresh = () => {
    refreshOrganization();
  };
  
  console.log('🔍 Billing Debug - currentOrganization:', currentOrganization);
  console.log('🔍 Billing Debug - stripeSubscriptionId:', organization?.stripeSubscriptionId);
  console.log('🔍 Billing Debug - planType:', organization?.planType);
  console.log('🔍 Billing Debug - subscriptionStatus:', organization?.subscriptionStatus);
  console.log('🔍 Billing Debug - hasActiveSubscription:', organization?.stripeSubscriptionId && organization?.subscriptionStatus === 'active');

  return (
    <div className="space-y-6">
      {/* Force visible test button */}
      <div className="w-full p-4 bg-yellow-100 border border-yellow-300 rounded">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Test Button - Force Refresh Subscription Data</span>
          <button 
            onClick={handleRefresh}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-lg font-bold rounded-lg border-4 border-red-400"
            title="Force refresh subscription data"
          >
            🔄 TEST REFRESH BUTTON
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Billing & Subscriptions</h2>
          <p className="text-gray-600">
            Choose the plan that fits your organization's needs
          </p>
        </div>
        <div className="flex items-center gap-4">
          {organization?.stripeSubscriptionId && organization?.subscriptionStatus === 'active' && (
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">
                Current: {organization.planType?.charAt(0).toUpperCase() + organization.planType?.slice(1)} Plan
              </span>
            </div>
          )}
          {(!organization?.stripeSubscriptionId || organization?.subscriptionStatus === 'trial') && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-600">
                Trial: {organization?.planType === 'trial' ? '1 User License' : 'No Active Plan'}
              </span>
            </div>
          )}
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium border-2 border-green-400 shadow-lg"
            title="Refresh subscription data"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {!organization?.stripeSubscriptionId || organization?.subscriptionStatus === 'trial' ? (
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
                  {organization.planType?.charAt(0).toUpperCase() + organization.planType?.slice(1) || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600">Current Plan</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {organization.maxUsers === -1 ? 'Unlimited' : organization.maxUsers || 1}
                </p>
                <p className="text-sm text-gray-600">Licensed Users</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {organization.subscriptionStatus?.charAt(0).toUpperCase() + organization.subscriptionStatus?.slice(1) || 'Active'}
                </p>
                <p className="text-sm text-gray-600">Status</p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Manage your subscription, update payment methods, and view billing history through Stripe's secure customer portal.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium"
                  title="Refresh subscription data"
                >
                  🔄 Refresh Data
                </button>
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
                    } else {
                      const message = data.message || data.error || 'Unable to open customer portal.';
                      alert(message);
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}