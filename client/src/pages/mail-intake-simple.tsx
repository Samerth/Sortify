import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Mail, Bell, Check, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface MailItem {
  id: string;
  type: string;
  status: string;
  trackingNumber?: string;
  sender?: string;
  arrivedAt: string;
  recipient?: {
    firstName: string;
    lastName: string;
    unit?: string;
  };
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  unit?: string;
}

export default function MailIntake() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "package",
    recipientId: "",
    locationId: "",
    sender: "",
    trackingNumber: "",
    description: "",
    courierCompany: "",
    collectedByStaff: "",
    collectorName: "",
    photo: null as File | null,
  });

  const { data: mailItems = [] } = useQuery({
    queryKey: ["/api/mail-items"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/mail-items", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mail items");
      return response.json();
    },
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ["/api/recipients"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/recipients", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recipients");
      return response.json();
    },
  });

  const createMailItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/mail-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": currentOrganization?.id || "",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create mail item");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Mail item logged successfully.",
      });
      setIsDialogOpen(false);
      setFormData({
        type: "package",
        recipientId: "",
        sender: "",
        trackingNumber: "",
        description: "",
        courierCompany: "",
        collectedByStaff: "",
        collectorName: "",
        photo: null,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log mail item.",
        variant: "destructive",
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMailItemMutation.mutate(formData);
  };

  const handleNotifyRecipient = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "notified", notifiedAt: new Date() },
    });
  };

  const handleMarkDelivered = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "delivered", deliveredAt: new Date() },
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      notified: { label: "Notified", variant: "default" as const },
      delivered: { label: "Delivered", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mail Intake</h1>
          <p className="text-gray-600">Process and track incoming mail and packages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              Log New Mail
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log New Mail Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="package">Package</option>
                  <option value="letter">Letter</option>
                  <option value="certified_mail">Certified Mail</option>
                  <option value="express">Express Mail</option>
                </select>
              </div>

              <div>
                <Label htmlFor="recipientId">Who is this package for?</Label>
                <p className="text-sm text-gray-500 mb-2">Select the guest, employee, or resident this mail belongs to</p>
                <select
                  id="recipientId"
                  value={formData.recipientId}
                  onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select recipient</option>
                  {(recipients as any[]).map((recipient: any) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.firstName} {recipient.lastName} 
                      {recipient.recipientType && ` (${recipient.recipientType.charAt(0).toUpperCase() + recipient.recipientType.slice(1)})`}
                      {recipient.unit && ` - Unit ${recipient.unit}`}
                      {recipient.department && ` - ${recipient.department}`}
                      {recipient.email && ` • ${recipient.email}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sender">Sender</Label>
                <Input
                  id="sender"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                  placeholder="Enter sender name"
                />
              </div>

              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="Enter tracking number"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <Label htmlFor="courierCompany">Courier Company</Label>
                <select
                  id="courierCompany"
                  value={formData.courierCompany}
                  onChange={(e) => setFormData({ ...formData, courierCompany: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select courier</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                  <option value="dhl">DHL</option>
                  <option value="usps">USPS</option>
                  <option value="amazon">Amazon Delivery</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="collectorName">Who Collected This Package?</Label>
                <p className="text-sm text-gray-500 mb-2">Staff member who signed for the package</p>
                <Input
                  id="collectorName"
                  value={formData.collectorName}
                  onChange={(e) => setFormData({ ...formData, collectorName: e.target.value })}
                  placeholder="Staff member name"
                />
              </div>

              <div>
                <Label htmlFor="photo">Package Photo</Label>
                <p className="text-sm text-gray-500 mb-2">Take a photo for verification</p>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formData.photo && (
                  <p className="text-sm text-green-600 mt-1">Photo selected: {formData.photo.name}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMailItemMutation.isPending}
                  className="flex-1"
                >
                  {createMailItemMutation.isPending ? "Logging..." : "Log Mail"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Mail Items</CardTitle>
        </CardHeader>
        <CardContent>
          {mailItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No mail items yet. Start by logging your first mail item!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mailItems.map((item: MailItem) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {item.type === "package" ? (
                        <Package className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Mail className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {item.recipient ? 
                          `${item.recipient.firstName} ${item.recipient.lastName}` : 
                          "Unknown Recipient"
                        }
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.sender && `From: ${item.sender}`}
                        {item.trackingNumber && ` • ${item.trackingNumber}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(item.arrivedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(item.status)}
                    {item.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNotifyRecipient(item.id)}
                        disabled={updateMailItemMutation.isPending}
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Notify
                      </Button>
                    )}
                    {item.status === "notified" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkDelivered(item.id)}
                        disabled={updateMailItemMutation.isPending}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Delivered
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}