import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Package, CreditCard, AlertTriangle } from "lucide-react";
import { useOrganization } from "./OrganizationProvider";

interface TrialInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  isExpired: boolean;
  planType: string;
  subscriptionStatus: string;
  usageLimits: {
    maxUsers: number;
    maxPackagesPerMonth: number;
    currentPackages: number;
    canAddUsers: boolean;
    canAddPackages: boolean;
  };
}

export function TrialStatus() {
  const { currentOrganization } = useOrganization();

  const { data: trialInfo } = useQuery<TrialInfo>({
    queryKey: ["/api/trial-info"],
    enabled: !!currentOrganization,
    refetchInterval: 60000, // Refresh every minute
  });

  if (!trialInfo || trialInfo.subscriptionStatus === "active") {
    return null; // Don't show for paid plans
  }

  const getStatusColor = () => {
    if (trialInfo.isExpired) return "destructive";
    if (trialInfo.daysRemaining <= 2) return "destructive";
    if (trialInfo.daysRemaining <= 5) return "secondary";
    return "default";
  };

  const getPackageUsagePercentage = () => {
    if (trialInfo.usageLimits.maxPackagesPerMonth === -1) return 0;
    return (trialInfo.usageLimits.currentPackages / trialInfo.usageLimits.maxPackagesPerMonth) * 100;
  };

  if (trialInfo.isExpired) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Trial Expired</p>
              <p className="text-sm text-red-700">
                Your free trial has ended. Upgrade to continue using Sortify.
              </p>
            </div>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Free Trial
          </CardTitle>
          <Badge variant={getStatusColor()}>
            {trialInfo.daysRemaining} days left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-500" />
              <span>Packages this month</span>
            </div>
            <span className="font-medium">
              {trialInfo.usageLimits.currentPackages} / {trialInfo.usageLimits.maxPackagesPerMonth}
            </span>
          </div>
          <Progress 
            value={getPackageUsagePercentage()} 
            className="h-2"
          />
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span>Team members</span>
            </div>
            <span className="font-medium">
              ? / {trialInfo.usageLimits.maxUsers}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button variant="outline" size="sm">
              View Pricing
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}