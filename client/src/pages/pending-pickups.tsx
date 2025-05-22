import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Mail, Check, Bell, Clock } from "lucide-react";
import { formatDistanceToNow, isAfter, subDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface MailItem {
  id: string;
  type: string;
  status: string;
  trackingNumber?: string;
  sender?: string;
  arrivedAt: string;
  notifiedAt?: string;
  recipient?: {
    firstName: string;
    lastName: string;
    unit?: string;
  };
}

export default function PendingPickups() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingItems = [], isLoading } = useQuery<MailItem[]>({
    queryKey: ["/api/mail-items", currentOrganization?.id, { status: "pending,notified" }],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/mail-items?status=pending", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch pending items");
      
      const items = await response.json();
      // Also fetch notified items
      const notifiedResponse = await fetch("/api/mail-items?status=notified", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (notifiedResponse.ok) {
        const notifiedItems = await notifiedResponse.json();
        return [...items, ...notifiedItems];
      }
      return items;
    },
  });

  const updateMailItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/mail-items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": currentOrganization?.id || "",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update mail item");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Mail item updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update mail item.",
        variant: "destructive",
      });
    },
  });

  const handleNotifyRecipient = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "notified", notifiedAt: new Date().toISOString() },
    });
  };

  const handleMarkDelivered = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "delivered", deliveredAt: new Date().toISOString() },
    });
  };

  const isOverdue = (arrivedAt: string) => {
    const arrived = new Date(arrivedAt);
    const threeDaysAgo = subDays(new Date(), 3);
    return isAfter(arrived, threeDaysAgo) === false;
  };

  const getStatusColor = (status: string, arrivedAt: string) => {
    if (isOverdue(arrivedAt)) {
      return "bg-red-100 text-red-800";
    }
    return status === "pending" 
      ? "bg-yellow-100 text-yellow-800"
      : "bg-blue-100 text-blue-800";
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Pending Pickups</h1>
            <p className="text-gray-600">Manage packages awaiting recipient pickup</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Removed global Mark Delivered button - use individual item buttons instead */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pending</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {pendingItems.length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {pendingItems.filter(item => isOverdue(item.arrivedAt)).length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Notified</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {pendingItems.filter(item => item.status === "notified").length}
                  </p>
                </div>
                <Bell className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Items Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Arrived</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : pendingItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No pending pickups
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingItems
                      .sort((a, b) => {
                        // Sort overdue items first
                        const aOverdue = isOverdue(a.arrivedAt);
                        const bOverdue = isOverdue(b.arrivedAt);
                        if (aOverdue && !bOverdue) return -1;
                        if (!aOverdue && bOverdue) return 1;
                        return new Date(a.arrivedAt).getTime() - new Date(b.arrivedAt).getTime();
                      })
                      .map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                {item.type === "package" ? (
                                  <Package className="w-5 h-5 text-primary" />
                                ) : (
                                  <Mail className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.type === "package" ? "Package" : item.type === "letter" ? "Letter" : "Certified Mail"}
                                </p>
                                {item.trackingNumber && (
                                  <p className="text-sm text-gray-600">
                                    Tracking: {item.trackingNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.recipient ? (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.recipient.firstName} {item.recipient.lastName}
                                </p>
                                {item.recipient.unit && (
                                  <p className="text-sm text-gray-600">{item.recipient.unit}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-gray-900">{item.sender || "Unknown"}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-gray-900">
                                {formatDistanceToNow(new Date(item.arrivedAt))} ago
                              </p>
                              {isOverdue(item.arrivedAt) && (
                                <p className="text-red-600 text-sm font-medium">Overdue</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary"
                              className={getStatusColor(item.status, item.arrivedAt)}
                            >
                              {isOverdue(item.arrivedAt) ? "Overdue" : item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {item.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleNotifyRecipient(item.id)}
                                  disabled={updateMailItemMutation.isPending}
                                >
                                  <Bell className="w-4 h-4 mr-1" />
                                  Notify
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleMarkDelivered(item.id)}
                                disabled={updateMailItemMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Delivered
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
