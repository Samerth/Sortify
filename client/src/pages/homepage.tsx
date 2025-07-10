import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Zap, Crown, ArrowRight, Package, Star } from "lucide-react";

const planFeatures = {
  starter: {
    name: "Starter",
    price: "$25",
    unit: "/license/month",
    description: "Perfect for small teams",
    maxPackages: 1000,
    features: [
      "Pay per license (unlimited users)",
      "1,000 packages/month",
      "Email notifications",
      "Basic analytics",
      "Photo storage"
    ],
    icon: <Users className="w-6 h-6" />,
    color: "text-blue-600"
  },
  professional: {
    name: "Professional",
    price: "$35",
    unit: "/license/month", 
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
    icon: <Zap className="w-6 h-6" />,
    color: "text-purple-600",
    recommended: true
  },
  enterprise: {
    name: "Enterprise",
    price: "$45",
    unit: "/license/month",
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
    icon: <Crown className="w-6 h-6" />,
    color: "text-amber-600"
  }
};

export default function Homepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Smart Package Management
            <span className="block text-blue-600">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your mailroom operations with intelligent package tracking, 
            automated notifications, and powerful analytics. Scale with license-based pricing.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Sortify?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Package className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Smart Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track packages from arrival to delivery with photo evidence and real-time status updates.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Manage unlimited users per license with role-based access and organization tools.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <Zap className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                <CardTitle>Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automated email and SMS notifications keep recipients informed about their packages.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">License-Based Pricing</h2>
            <p className="text-lg text-gray-600">
              Pay per license, get unlimited users. Scale your team without limits.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {Object.entries(planFeatures).map(([key, plan]) => (
              <Card key={key} className={`relative border-2 hover:border-blue-200 transition-all duration-300 ${plan.recommended ? 'border-blue-300 shadow-lg scale-105' : 'border-gray-200'}`}>
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-6">
                  <div className={`${plan.color} mb-4`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">{plan.unit}</span>
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">
                      {typeof plan.maxPackages === 'number' ? `${plan.maxPackages}` : plan.maxPackages} packages/month
                    </span>
                  </div>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="pt-6">
                    <Link href="/auth/login">
                      <Button 
                        className={`w-full ${plan.recommended ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        variant={plan.recommended ? "default" : "outline"}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
              <Star className="w-4 h-4" />
              <span className="font-medium">All plans include automated billing and instant activation</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Mailroom?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join organizations worldwide who trust Sortify for their package management needs.
          </p>
          <Link href="/auth/login">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Start Your Subscription Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <p>&copy; 2025 Sortify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}