import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, LogIn } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = () => {
    setIsLoading(true);
    // Direct redirect to authentication without intermediate page
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Auth */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MailManager</h1>
            <p className="text-gray-600 text-sm">Your complete solution for mailroom management</p>
          </div>

          {/* Auth Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to MailManager</h2>
              <p className="text-gray-600 text-sm mb-6">
                Sign in to access your mailroom management dashboard.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={handleAuth}
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                <LogIn className="w-5 h-5 mr-2" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              
              <div className="text-center">
                <p className="text-gray-500 text-xs">
                  Multiple sign-in options available • New users welcome
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Secure authentication • Automatic setup • Instant access
                </p>
              </div>
            </div>
          </div>
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