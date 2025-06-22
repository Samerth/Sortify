import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Building2, 
  Shield, 
  Search, 
  Filter,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Organization {
  id: string;
  name: string;
  domain: string;
  planType: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  memberCount: number;
  packageCount: number;
}

interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  createdAt: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  activeTrials: number;
  paidSubscriptions: number;
  totalPackagesThisMonth: number;
  revenue: number;
}

export default function SuperAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const { toast } = useToast();

  // Fetch system statistics
  const { data: stats } = useQuery<SystemStats>({
    queryKey: ["/api/super-admin/stats"],
    retry: false,
  });

  // Fetch all organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/super-admin/organizations"],
    retry: false,
  });

  // Fetch all users
  const { data: users = [] } = useQuery<SuperAdminUser[]>({
    queryKey: ["/api/super-admin/users"],
    retry: false,
  });

  // Mutation to update organization status
  const updateOrgMutation = useMutation({
    mutationFn: async (data: { orgId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/organizations/${data.orgId}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({ title: "Organization updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update organization", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation to update user permissions
  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/super-admin/users/${data.userId}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      toast({ title: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      trial: "bg-blue-100 text-blue-800",
      expired: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">Manage all organizations and users across Sortify</p>
        </div>
        <Badge variant="destructive" className="px-3 py-1">
          <Shield className="w-4 h-4 mr-1" />
          Super Admin Access
        </Badge>
      </div>

      {/* System Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Organizations</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600">Active Trials</span>
              </div>
              <p className="text-2xl font-bold">{stats.activeTrials}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Paid Subs</span>
              </div>
              <p className="text-2xl font-bold">{stats.paidSubscriptions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-gray-600">Packages/Month</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalPackagesThisMonth}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              <p className="text-2xl font-bold">${stats.revenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search organizations, users, or domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizations ({filteredOrganizations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Packages</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.domain || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.planType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(org.subscriptionStatus)}>
                          {org.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.memberCount}</TableCell>
                      <TableCell>{org.packageCount}</TableCell>
                      <TableCell>{format(new Date(org.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedOrg(org)}
                            >
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Manage Organization: {org.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Subscription Status</Label>
                                  <Select
                                    value={org.subscriptionStatus}
                                    onValueChange={(value) => {
                                      updateOrgMutation.mutate({
                                        orgId: org.id,
                                        updates: { subscriptionStatus: value }
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="trial">Trial</SelectItem>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="expired">Expired</SelectItem>
                                      <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Plan Type</Label>
                                  <Select
                                    value={org.planType}
                                    onValueChange={(value) => {
                                      updateOrgMutation.mutate({
                                        orgId: org.id,
                                        updates: { planType: value }
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="trial">Trial</SelectItem>
                                      <SelectItem value="starter">Starter</SelectItem>
                                      <SelectItem value="professional">Professional</SelectItem>
                                      <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <p><strong>Created:</strong> {format(new Date(org.createdAt), "PPP")}</p>
                                <p><strong>Members:</strong> {org.memberCount}</p>
                                <p><strong>Packages:</strong> {org.packageCount}</p>
                                {org.trialEndsAt && (
                                  <p><strong>Trial Ends:</strong> {format(new Date(org.trialEndsAt), "PPP")}</p>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organizations</TableHead>
                    <TableHead>Super Admin</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.organizations.map((org) => (
                            <Badge key={org.id} variant="outline" className="text-xs">
                              {org.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isSuperAdmin ? (
                          <Badge variant="destructive">
                            <Shield className="w-3 h-3 mr-1" />
                            Super Admin
                          </Badge>
                        ) : (
                          <span className="text-gray-400">Regular User</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(user.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage User: {user.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="superAdmin"
                                    checked={user.isSuperAdmin}
                                    onChange={(e) => {
                                      updateUserMutation.mutate({
                                        userId: user.id,
                                        updates: { isSuperAdmin: e.target.checked }
                                      });
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor="superAdmin">Grant Super Admin Access</Label>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Created:</strong> {format(new Date(user.createdAt), "PPP")}</p>
                                <p><strong>Organizations:</strong> {user.organizations.length}</p>
                              </div>
                              {user.isSuperAdmin && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-red-800">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">Super Admin Warning</span>
                                  </div>
                                  <p className="text-sm text-red-700 mt-1">
                                    This user has full system access and can manage all organizations and users.
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">System logs and audit trail coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}