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
                Choose your preferred sign-in method to access your mailroom dashboard.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleAuth}
                variant="outline"
                className="w-full h-12 text-base bg-white hover:bg-gray-50 border-gray-300"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? "Signing in..." : "Continue with Google"}
              </Button>
              
              <Button 
                onClick={handleAuth}
                variant="outline"
                className="w-full h-12 text-base bg-white hover:bg-gray-50 border-gray-300"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {isLoading ? "Signing in..." : "Continue with GitHub"}
              </Button>
              
              <Button 
                onClick={handleAuth}
                variant="outline"
                className="w-full h-12 text-base bg-white hover:bg-gray-50 border-gray-300"
                disabled={isLoading}
              >
                <LogIn className="w-5 h-5 mr-3" />
                {isLoading ? "Signing in..." : "Continue with Email"}
              </Button>
              
              <div className="text-center">
                <p className="text-gray-500 text-xs">
                  New to MailManager? Your account will be created automatically on first sign in.
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