import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Clock, 
  Users, 
  CheckCircle, 
  Plus, 
  Bell, 
  QrCode, 
  UserPlus, 
  TrendingUp,
  Package,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  todaysMail: number;
  pendingPickups: number;
  activeRecipients: number;
  deliveryRate: number;
}

interface RecentActivity {
  id: string;
  type: string;
  status: string;
  arrivedAt: string;
  recipient?: {
    firstName: string;
    lastName: string;
  };
  sender?: string;
}

export default function Dashboard() {
  const { currentOrganization } = useOrganization();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: recentActivity = [], isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/recent-activity?limit=5", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch recent activity");
      return response.json();
    },
  });

  if (!currentOrganization) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to continue.</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your mailroom.</p>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Mail</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {statsLoading ? "..." : stats?.todaysMail || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-green-600 text-sm mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Pickups</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {statsLoading ? "..." : stats?.pendingPickups || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-yellow-600 text-sm mt-4 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                2 overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Recipients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {statsLoading ? "..." : stats?.activeRecipients || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-green-600 text-sm mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +5 new this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {statsLoading ? "..." : `${stats?.deliveryRate || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-green-600 text-sm mt-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                +0.5% this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6">
          {/* Recent Mail Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Mail Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activityLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent activity
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {activity.type === "package" ? (
                        <Package className="w-5 h-5 text-primary" />
                      ) : (
                        <Mail className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {activity.type === "package" ? "Package" : "Mail"} for {" "}
                        {activity.recipient 
                          ? `${activity.recipient.firstName} ${activity.recipient.lastName}`
                          : "Unknown Recipient"
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        From: {activity.sender || "Unknown"} • {formatDistanceToNow(new Date(activity.arrivedAt))} ago
                      </p>
                    </div>
                    <Badge 
                      variant={activity.status === "delivered" ? "default" : "secondary"}
                      className={
                        activity.status === "pending" 
                          ? "bg-yellow-100 text-yellow-800"
                          : activity.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>


        </div>
      </main>
    </>
  );
}
