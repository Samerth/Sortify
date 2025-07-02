import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Users, Package, CheckCircle } from "lucide-react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import PayPalButton from "@/components/PayPalButton";

interface PlanDetails {
  name: string;
  pricePerUser: number;
  minUsers: number;
  maxUsers: number | null;
  features: string[];
}

const plans: Record<string, PlanDetails> = {
  starter: {
    name: "Starter",
    pricePerUser: 25,
    minUsers: 3,
    maxUsers: 25,
    features: [
      "Up to 25 users",
      "1,000 packages/month",
      "Email notifications",
      "Basic analytics",
      "Photo storage"
    ]
  },
  professional: {
    name: "Professional",
    pricePerUser: 35,
    minUsers: 5,
    maxUsers: 100,
    features: [
      "Up to 100 users",
      "Unlimited packages",
      "Email & SMS notifications",
      "Advanced analytics",
      "API integrations",
      "Priority support"
    ]
  },
  enterprise: {
    name: "Enterprise",
    pricePerUser: 45,
    minUsers: 10,
    maxUsers: null,
    features: [
      "Unlimited users",
      "Unlimited packages",
      "White-label branding",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee"
    ]
  }
};

export default function Checkout() {
  const [selectedPlan, setSelectedPlan] = useState<string>("professional");
  const [userCount, setUserCount] = useState<number>(5);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const currentPlan = plans[selectedPlan];
  const monthlyTotal = userCount * currentPlan.pricePerUser;
  const yearlyTotal = monthlyTotal * 12 * 0.8; // 20% discount for annual

  const handleUpgrade = async () => {
    try {
      toast({
        title: "Stripe Integration Coming Soon",
        description: "Payment processing will be available in the next update. Your trial continues!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process upgrade. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upgrade Your Plan
          </h1>
          <p className="text-gray-600">
            Choose the perfect plan for {currentOrganization?.name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Select Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {Object.entries(plans).map(([key, plan]) => (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPlan === key
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPlan(key)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{plan.name}</h3>
                        <p className="text-sm text-gray-600">
                          ${plan.pricePerUser}/user/month
                        </p>
                      </div>
                      {selectedPlan === key && (
                        <Badge className="bg-blue-500">Selected</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="users">Number of Users</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-gray-500" />
                    <Input
                      id="users"
                      type="number"
                      min={currentPlan.minUsers}
                      max={currentPlan.maxUsers || 1000}
                      value={userCount}
                      onChange={(e) => setUserCount(Number(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum {currentPlan.minUsers} users required
                  </p>
                </div>

                <div>
                  <Label>Billing Cycle</Label>
                  <Select defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">
                        Yearly (20% discount)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{currentPlan.name} Plan</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{userCount} users × ${currentPlan.pricePerUser}/month</span>
                      <span>${monthlyTotal}</span>
                    </div>
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Monthly Total</span>
                        <span>${monthlyTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Included Features:</h4>
                  <div className="space-y-2">
                    {currentPlan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">7-Day Free Trial</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Start your trial now. You won't be charged until after the trial period ends.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Choose Payment Method:</h4>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Credit Card
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex items-center gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.52 18.54H6.44l1.65-10.44h2.08zM11.27 8.1c.84 0 1.72.13 2.36.39.64.26 1.16.63 1.51 1.07.35.44.57.94.66 1.49.09.55.07 1.12-.07 1.7-.14.58-.39 1.13-.74 1.61-.35.48-.78.89-1.29 1.22-.51.33-1.08.58-1.7.75-.62.17-1.28.26-1.98.26h-1.66l.42-2.7h1.24c.6 0 1.11-.15 1.54-.44.43-.29.74-.69.93-1.2.19-.51.23-1.03.13-1.56-.1-.53-.38-.93-.84-1.2-.46-.27-1.08-.41-1.86-.41h-.85l-.42 2.7h-2.08l1.65-10.44h2.08l-.42 2.7h.85z"/>
                        </svg>
                        PayPal
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === "card" && (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleUpgrade}
                  >
                    Start Free Trial
                  </Button>
                )}

                {paymentMethod === "paypal" && (
                  <div className="w-full">
                    <PayPalButton
                      amount={monthlyTotal.toString()}
                      currency="USD"
                      intent="CAPTURE"
                      planType={selectedPlan}
                      userCount={userCount}
                      onSuccess={async (orderData) => {
                        console.log("PayPal payment successful:", orderData);
                        
                        try {
                          // Upgrade the organization after successful payment
                          const response = await fetch(`/api/organizations/${organization?.id}/upgrade`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-organization-id': organization?.id || '',
                            },
                            body: JSON.stringify({
                              planType: selectedPlan,
                              userCount: userCount
                            })
                          });

                          if (response.ok) {
                            const upgradeResult = await response.json();
                            console.log("Organization upgraded:", upgradeResult);
                            
                            toast({
                              title: "Payment Successful!",
                              description: `Your organization has been upgraded to ${currentPlan.name} plan.`,
                            });
                            
                            // Redirect to dashboard after successful upgrade
                            setTimeout(() => {
                              window.location.href = "/dashboard";
                            }, 1500);
                          } else {
                            throw new Error('Failed to upgrade organization');
                          }
                        } catch (error) {
                          console.error("Organization upgrade failed:", error);
                          toast({
                            title: "Payment Successful, but...",
                            description: "Payment completed successfully, but there was an issue updating your plan. Please contact support.",
                            variant: "destructive",
                          });
                        }
                      }}
                      onError={(error) => {
                        console.error("PayPal payment failed:", error);
                        toast({
                          title: "Payment Failed",
                          description: "There was an issue processing your payment. Please try again.",
                          variant: "destructive",
                        });
                      }}
                    />
                  </div>
                )}
                
                {paymentMethod === "card" && (
                  <div className="text-center">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Stripe Integration:</strong> Payment processing coming in next update. 
                        Your trial will continue uninterrupted.
                      </p>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 text-center">
                  Cancel anytime. No setup fees. Secure payment processing by Stripe.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}