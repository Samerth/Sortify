import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Package, Users, BarChart3 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect, useLocation } from "wouter";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
  });

  // Extract invitation token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invitation') || urlParams.get('token');
    if (token) {
      setInvitationToken(token);
    }
  }, [location]);

  // Fetch invitation details if token exists
  const { data: invitation, error: invitationError } = useQuery({
    queryKey: ['/api/invitations/verify', invitationToken],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/verify/${invitationToken}`);
      if (!res.ok) {
        // For invalid tokens, just return null and allow registration
        if (res.status === 404) {
          return null;
        }
        throw new Error('Failed to verify invitation');
      }
      return res.json();
    },
    enabled: !!invitationToken,
    retry: false,
  });

  // Update form email when invitation is loaded
  useEffect(() => {
    if (invitation && 'email' in invitation) {
      setRegisterForm(prev => ({
        ...prev,
        email: invitation.email
      }));
      setInvitationData(invitation);
    }
  }, [invitation]);

  // Show invitation status
  const invitationStatus = invitationToken ? (
    invitation ? 'valid' : 
    invitationError ? 'invalid' : 
    'loading'
  ) : null;

  // Redirect if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", data);
      return await res.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof registerForm) => {
      const payload = {
        ...data,
        invitationToken: invitationToken || undefined
      };
      const res = await apiRequest("POST", "/api/register", payload);
      return await res.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Sortify
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Smart package sorting and mailroom management platform
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Mail className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Smart Sorting</h3>
              <p className="text-sm text-gray-600">
                Intelligent package organization and routing
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Users className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
              <p className="text-sm text-gray-600">
                Role-based access and user management system
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Package className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Automated Processing</h3>
              <p className="text-sm text-gray-600">
                Streamlined workflows for efficient package handling
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BarChart3 className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">
                Track delivery rates and mailroom performance
              </p>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Welcome to Sortify</CardTitle>
              <CardDescription>
                {invitationData ? 
                  `You've been invited to join ${invitationData.organizationName}` :
                  invitationStatus === 'invalid' ?
                  "Invalid or expired invitation. You can still create an account." :
                  "Sign in to your account or create a new one"
                }
              </CardDescription>
              {invitationData && (
                <div className="bg-blue-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-blue-700">
                    <strong>Organization:</strong> {invitationData.organizationName}<br/>
                    <strong>Role:</strong> {invitationData.role}<br/>
                    <strong>Email:</strong> {invitationData.email}
                  </p>
                </div>
              )}
              {invitationStatus === 'invalid' && (
                <div className="bg-orange-50 p-3 rounded-lg mt-2">
                  <p className="text-sm text-orange-700">
                    The invitation link is invalid or expired, but you can still create an account.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={invitationToken ? "register" : "login"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        type="text"
                        value={loginForm.username}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, username: e.target.value })
                        }
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input
                        type="password"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">First Name</label>
                        <Input
                          type="text"
                          value={registerForm.firstName}
                          onChange={(e) =>
                            setRegisterForm({ ...registerForm, firstName: e.target.value })
                          }
                          placeholder="First name"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Last Name</label>
                        <Input
                          type="text"
                          value={registerForm.lastName}
                          onChange={(e) =>
                            setRegisterForm({ ...registerForm, lastName: e.target.value })
                          }
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        type="text"
                        value={registerForm.username}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, username: e.target.value })
                        }
                        placeholder="Choose a username"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, email: e.target.value })
                        }
                        placeholder="Enter your email"
                        required
                        readOnly={!!invitationToken}
                        className={invitationToken ? "bg-gray-50" : ""}
                      />
                      {invitationToken && (
                        <p className="text-xs text-gray-500 mt-1">
                          Email pre-filled from invitation
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input
                        type="password"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm({ ...registerForm, password: e.target.value })
                        }
                        placeholder="Create a password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}