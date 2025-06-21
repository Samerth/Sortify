import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Users, Package, CheckCircle } from "lucide-react";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";

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
    minUsers: 1,
    maxUsers: 5,
    features: [
      "Up to 5 users included",
      "500 packages/month",
      "Email notifications",
      "Basic analytics",
      "Photo storage"
    ]
  },
  professional: {
    name: "Professional",
    pricePerUser: 75,
    minUsers: 1,
    maxUsers: 25,
    features: [
      "Up to 25 users included",
      "2,500 packages/month",
      "Email & SMS notifications",
      "Advanced analytics",
      "API integrations",
      "Priority support"
    ]
  },
  enterprise: {
    name: "Enterprise",
    pricePerUser: 199,
    minUsers: 1,
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
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const currentPlan = plans[selectedPlan];
  const monthlyTotal = currentPlan.pricePerUser;
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
                          ${plan.pricePerUser}/month
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Users Included</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {currentPlan.maxUsers === null 
                      ? "Unlimited users included" 
                      : `Up to ${currentPlan.maxUsers} users included in this plan`
                    }
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
                      <span>{currentPlan.name} Plan</span>
                      <span>${currentPlan.pricePerUser}/month</span>
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
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleUpgrade}
                >
                  Start Free Trial
                </Button>
                
                <div className="text-center">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Stripe Integration:</strong> Payment processing coming in next update. 
                      Your trial will continue uninterrupted.
                    </p>
                  </div>
                </div>
                
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