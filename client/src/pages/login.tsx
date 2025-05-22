import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Mail } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  const handleRegister = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MailManager</h1>
            <p className="text-gray-600 text-sm">Your complete solution for mailroom management</p>
          </div>

          {/* Login/Register Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Login to your account</h2>
                <p className="text-gray-600 text-sm mb-6">Enter your email and password to access your dashboard</p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <Button 
                    onClick={handleLogin}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Redirecting..." : "Login with Replit"}
                  </Button>
                </div>

                <div className="text-center mt-4">
                  <p className="text-gray-600 text-sm">
                    Don't have an account?{" "}
                    <button 
                      onClick={() => document.querySelector('[value="register"]')?.click()}
                      className="text-primary hover:underline"
                    >
                      Register
                    </button>
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>
                <p className="text-gray-600 text-sm mb-6">Get started with your mailroom management system</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        className="mt-1"
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        className="mt-1"
                        disabled
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      type="text"
                      placeholder="Acme Corp"
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="regEmail">Email</Label>
                    <Input
                      id="regEmail"
                      type="email"
                      placeholder="you@example.com"
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="regPassword">Password</Label>
                    <Input
                      id="regPassword"
                      type="password"
                      placeholder="••••••••"
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <Button 
                    onClick={handleRegister}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Redirecting..." : "Create Account with Replit"}
                  </Button>
                </div>

                <div className="text-center mt-4">
                  <p className="text-gray-600 text-sm">
                    Already have an account?{" "}
                    <button 
                      onClick={() => document.querySelector('[value="login"]')?.click()}
                      className="text-primary hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="flex-1 bg-gradient-to-br from-primary to-primary-dark text-white p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-center">
        <div className="max-w-lg">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Streamline Your Mailroom Operations</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Efficient package tracking & management</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Automated recipient notifications</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Smart analytics & reporting tools</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Secure chain of custody tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5" />
              <span>Barcode & OCR scanning support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
