import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OrganizationProvider, useOrganization } from "@/components/OrganizationProvider";
import OrganizationSetup from "@/components/OrganizationSetup";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import MailIntake from "@/pages/mail-intake-simple";
import PendingPickups from "@/pages/pending-pickups";
import Recipients from "@/pages/recipients";
import History from "@/pages/history";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import OrganizationSettings from "@/pages/organization-settings";
import SettingsCustomization from "@/pages/settings-customization";
import Checkout from "@/pages/checkout";
import SuperAdmin from "@/pages/super-admin";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";

function ProtectedContent() {
  const { organizations, isLoading } = useOrganization();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (organizations.length === 0) {
    return <OrganizationSetup />;
  }
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/mail-intake" component={MailIntake} />
      <Route path="/pending-pickups" component={PendingPickups} />
      <Route path="/recipients" component={Recipients} />
      <Route path="/history" component={History} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/settings" component={Settings} />
      <Route path="/organization-settings" component={OrganizationSettings} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/super-admin" component={SuperAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedRoutes() {
  return (
    <OrganizationProvider>
      <Layout>
        <ProtectedContent />
      </Layout>
    </OrganizationProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {user ? (
        <Route>
          <AuthenticatedRoutes />
        </Route>
      ) : (
        <>
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/" component={Landing} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
