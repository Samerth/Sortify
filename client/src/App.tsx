import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/components/OrganizationProvider";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import MailIntake from "@/pages/mail-intake";
import PendingPickups from "@/pages/pending-pickups";
import Recipients from "@/pages/recipients";
import History from "@/pages/history";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <OrganizationProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/mail-intake" component={MailIntake} />
          <Route path="/pending-pickups" component={PendingPickups} />
          <Route path="/recipients" component={Recipients} />
          <Route path="/history" component={History} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
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
        <Route path="*" component={LoginPage} />
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
