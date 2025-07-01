import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, QrCode, Package, Mail, Bell, Check, Eye, Edit, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMailItemSchema, insertRecipientSchema } from "@shared/schema";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

const mailItemFormSchema = insertMailItemSchema.extend({
  recipientId: z.string().optional(),
});

const recipientFormSchema = insertRecipientSchema.extend({
  recipientType: z.string().default("resident"),
});

type MailItemFormData = z.infer<typeof mailItemFormSchema>;
type RecipientFormData = z.infer<typeof recipientFormSchema>;

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
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    search: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<MailItemFormData>({
    resolver: zodResolver(mailItemFormSchema),
    defaultValues: {
      type: "package",
      status: "pending",
    },
  });

  const { data: mailItems = [], isLoading: mailLoading } = useQuery<MailItem[]>({
    queryKey: ["/api/mail-items", currentOrganization?.id, filters],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      
      const response = await fetch(`/api/mail-items?${params}`, {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch mail items");
      return response.json();
    },
  });

  const { data: recipients = [] } = useQuery<Recipient[]>({
    queryKey: ["/api/recipients", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/recipients", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch recipients");
      return response.json();
    },
  });

  const createMailItemMutation = useMutation({
    mutationFn: async (data: MailItemFormData) => {
      return apiRequest("POST", "/api/mail-items", {
        ...data,
        organizationId: currentOrganization!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-activity"] });
      toast({
        title: "Success",
        description: "Mail item logged successfully.",
      });
      setIsDialogOpen(false);
      form.reset();
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<MailItemFormData> }) => {
      return apiRequest("PUT", `/api/mail-items/${id}`, data);
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

  const onSubmit = (data: MailItemFormData) => {
    createMailItemMutation.mutate(data);
  };

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

  const filteredMailItems = mailItems.filter(item => {
    const searchLower = filters.search.toLowerCase();
    const recipientName = item.recipient 
      ? `${item.recipient.firstName} ${item.recipient.lastName}`.toLowerCase()
      : "";
    const sender = item.sender?.toLowerCase() || "";
    const tracking = item.trackingNumber?.toLowerCase() || "";
    
    return recipientName.includes(searchLower) || 
           sender.includes(searchLower) || 
           tracking.includes(searchLower);
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
            <h1 className="text-2xl font-bold text-gray-900">Mail Intake</h1>
            <p className="text-gray-600">Process and track incoming mail and packages</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              Bulk Scan
            </Button>
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
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="package">Package</SelectItem>
                              <SelectItem value="letter">Letter</SelectItem>
                              <SelectItem value="certified_mail">Certified Mail</SelectItem>
                              <SelectItem value="express">Express Mail</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recipient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {recipients.filter(recipient => recipient.id && recipient.id.trim() !== '').map((recipient) => (
                                <SelectItem key={recipient.id} value={recipient.id}>
                                  {recipient.firstName} {recipient.lastName} {recipient.unit && `(${recipient.unit})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sender</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter sender name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trackingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tracking Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter tracking number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMailItemMutation.isPending}
                      >
                        {createMailItemMutation.isPending ? "Logging..." : "Log Mail Item"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-900">Type:</label>
                <Select 
                  value={filters.type} 
                  onValueChange={(value) => setFilters({...filters, type: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="certified_mail">Certified Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-900">Status:</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters({...filters, status: value})}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="notified">Notified</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Input
                  placeholder="Search recipient, sender, or tracking number..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mail Items Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Arrived</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mailLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        <TableCell><div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : filteredMailItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No mail items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMailItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Checkbox />
                        </TableCell>
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
                          <p className="text-gray-900">
                            {formatDistanceToNow(new Date(item.arrivedAt))} ago
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={
                              item.status === "pending" 
                                ? "bg-yellow-100 text-yellow-800"
                                : item.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleNotifyRecipient(item.id)}
                                disabled={updateMailItemMutation.isPending}
                              >
                                <Bell className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                            {(item.status === "pending" || item.status === "notified") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkDelivered(item.id)}
                                disabled={updateMailItemMutation.isPending}
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4 text-gray-600" />
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
