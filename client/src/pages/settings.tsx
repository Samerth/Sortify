import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Building, 
  Bell, 
  MapPin, 
  User, 
  Shield, 
  Save,
  Settings as SettingsIcon,
  Plus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrganizationSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const organizationFormSchema = insertOrganizationSchema.partial();
type OrganizationFormData = z.infer<typeof organizationFormSchema>;

const mailroomFormSchema = z.object({
  name: z.string().min(1, "Mailroom name is required"),
  description: z.string().optional(),
});
type MailroomFormData = z.infer<typeof mailroomFormSchema>;

const locationFormSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  type: z.string().min(1, "Type is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  notes: z.string().optional(),
  mailroomId: z.string().min(1, "Mailroom is required"),
});
type LocationFormData = z.infer<typeof locationFormSchema>;

interface Organization {
  id: string;
  name: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
}

interface MailroomLocation {
  id: string;
  name: string;
  type: string;
  capacity?: number;
  currentCount?: number;
  notes?: string;
  organizationId: string;
  isActive: boolean;
}

export default function Settings() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("organization");
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showMailroomForm, setShowMailroomForm] = useState(false);
  const [selectedMailroomId, setSelectedMailroomId] = useState<string | null>(null);
  const [editingMailroom, setEditingMailroom] = useState<any>(null);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
  });

  const locationForm = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      type: "bin",
      capacity: 20,
      notes: "",
      mailroomId: "",
    },
  });

  const mailroomForm = useForm<MailroomFormData>({
    resolver: zodResolver(mailroomFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch organization data
  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ["/api/organizations", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${currentOrganization!.id}`, {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch organization");
      return response.json();
    },
  });

  // Fetch mailrooms data
  const { data: mailrooms = [] } = useQuery({
    queryKey: ["/api/mailrooms"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch('/api/mailrooms', {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mailrooms");
      return response.json();
    },
  });

  // Auto-select mailroom when Add Storage is clicked
  React.useEffect(() => {
    if (selectedMailroomId && showLocationForm) {
      locationForm.setValue('mailroomId', selectedMailroomId);
    }
  }, [selectedMailroomId, showLocationForm, locationForm]);

  // Update form when organization data is loaded
  React.useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        address: organization.address || "",
        contactName: organization.contactName || "",
        contactEmail: organization.contactEmail || "",
        contactPhone: organization.contactPhone || "",
        logoUrl: organization.logoUrl || "",
      });
    }
  }, [organization, form]);

  // Fetch storage locations
  const { data: locations = [], refetch: refetchLocations } = useQuery<MailroomLocation[]>({
    queryKey: ["/api/mailroom-locations"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/mailroom-locations", {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  // Mailroom mutations
  const createMailroomMutation = useMutation({
    mutationFn: async (data: MailroomFormData) => {
      const response = await fetch('/api/mailrooms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': currentOrganization!.id,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to create mailroom');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mailroom created successfully!" });
      mailroomForm.reset();
      setShowMailroomForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/mailrooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating mailroom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await fetch('/api/mailroom-locations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': currentOrganization!.id,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to create location');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Storage location created successfully!" });
      locationForm.reset();
      setShowLocationForm(false);
      refetchLocations();
      queryClient.invalidateQueries({ queryKey: ["/api/mailroom-locations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating location",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      return apiRequest("PUT", `/api/organizations/${currentOrganization!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization settings updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update organization settings.",
        variant: "destructive",
      });
    },
  });

  const updateMailroomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MailroomFormData }) => {
      const response = await fetch(`/api/mailrooms/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': currentOrganization!.id,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update mailroom: ${errorText}`);
      }
      
      try {
        return await response.json();
      } catch (parseError) {
        // If JSON parsing fails but request was successful, return success
        return { message: "Mailroom updated successfully" };
      }
    },
    onSuccess: () => {
      toast({ title: "Mailroom updated successfully!" });
      mailroomForm.reset();
      setEditingMailroom(null);
      setShowMailroomForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/mailrooms"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating mailroom",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMailroomMutation = useMutation({
    mutationFn: async (mailroomId: string) => {
      const response = await fetch(`/api/mailrooms/${mailroomId}`, {
        method: 'DELETE',
        headers: { 
          'x-organization-id': currentOrganization!.id,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete mailroom');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Mailroom deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/mailrooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mailroom-locations"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting mailroom", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const response = await fetch(`/api/mailroom-locations/${locationId}`, {
        method: 'DELETE',
        headers: { 
          'x-organization-id': currentOrganization!.id,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete storage location: ${errorText}`);
      }
      
      try {
        return await response.json();
      } catch (parseError) {
        // If JSON parsing fails but request was successful, return success
        return { message: "Storage location deleted successfully" };
      }
    },
    onSuccess: () => {
      toast({ title: "Storage location deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/mailroom-locations"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting storage location", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    updateOrganizationMutation.mutate(data);
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your organization's settings and preferences</p>
          </div>
          <div className="flex items-center space-x-4">
            {activeTab === "organization" && (
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateOrganizationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateOrganizationMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
                  <TabsList className="grid w-full grid-rows-5 h-auto">
                    <TabsTrigger 
                      value="organization" 
                      className="justify-start px-3 py-2"
                    >
                      <Building className="w-4 h-4 mr-2" />
                      Organization
                    </TabsTrigger>
                    <TabsTrigger 
                      value="notifications" 
                      className="justify-start px-3 py-2"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger 
                      value="mailrooms" 
                      className="justify-start px-3 py-2"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Mailrooms
                    </TabsTrigger>
                    <TabsTrigger 
                      value="account" 
                      className="justify-start px-3 py-2"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Account
                    </TabsTrigger>
                    <TabsTrigger 
                      value="users" 
                      className="justify-start px-3 py-2"
                    >
                      <User className="w-4 h-4 mr-2" />
                      User Management
                    </TabsTrigger>
                    <TabsTrigger 
                      value="security" 
                      className="justify-start px-3 py-2"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Security
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab}>
              {/* Organization Settings */}
              <TabsContent value="organization">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <Building className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Organization Settings</h3>
                        <p className="text-gray-600">Manage your organization's details and appearance</p>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="w-full h-10 bg-gray-200 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Organization Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter organization name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    rows={3} 
                                    placeholder="Enter your organization's address" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="contactName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Contact person name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="contactEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="contact@organization.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="contactPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logo URL</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url" 
                                    placeholder="https://example.com/logo.png" 
                                    {...field} 
                                  />
                                </FormControl>
                                <p className="text-xs text-gray-500 mt-1">
                                  Enter a URL for your organization's logo
                                </p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </form>
                      </Form>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Settings */}
              <TabsContent value="notifications">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <Bell className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
                        <p className="text-gray-600">Configure when and how you receive notifications</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Email Notifications</h4>
                          <p className="text-sm text-gray-600">Receive email alerts for important events</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                          <p className="text-sm text-gray-600">Get text alerts for urgent deliveries</p>
                        </div>
                        <Switch />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Daily Digest</h4>
                          <p className="text-sm text-gray-600">Daily summary of mailroom activity</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Overdue Alerts</h4>
                          <p className="text-sm text-gray-600">Notifications for packages pending pickup</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Delivery Confirmations</h4>
                          <p className="text-sm text-gray-600">Confirm when packages are delivered</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Mailrooms Settings */}
              <TabsContent value="mailrooms">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <MapPin className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Mailroom Settings</h3>
                        <p className="text-gray-600">Configure mailroom locations and settings</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Mailroom Hierarchy</h4>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => setShowMailroomForm(!showMailroomForm)}
                        >
                          <Building className="w-4 h-4 mr-2" />
                          {showMailroomForm ? "Cancel" : "Add Mailroom"}
                        </Button>
                      </div>

                      {showMailroomForm && (
                        <Card className="p-4 bg-gray-50">
                          <Form {...mailroomForm}>
                            <form onSubmit={mailroomForm.handleSubmit((data) => {
                              if (editingMailroom) {
                                updateMailroomMutation.mutate({ id: editingMailroom.id, data });
                              } else {
                                createMailroomMutation.mutate(data);
                              }
                            })}>
                              <div className="space-y-4">
                                <div>
                                  <h5 className="font-medium mb-3">{editingMailroom ? "Edit Mailroom" : "Add New Mailroom"}</h5>
                                  <p className="text-sm text-gray-600 mb-4">
                                    Create a parent mailroom where you can add bins, shelves, and lockers
                                  </p>
                                </div>
                                
                                <FormField
                                  control={mailroomForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Mailroom Name</FormLabel>
                                      <FormControl>
                                        <input
                                          {...field}
                                          placeholder="e.g., Main Mailroom, Reception Area"
                                          className="w-full px-3 py-2 border rounded-lg"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={mailroomForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description (Optional)</FormLabel>
                                      <FormControl>
                                        <textarea
                                          {...field}
                                          placeholder="Brief description of this mailroom location..."
                                          className="w-full px-3 py-2 border rounded-lg"
                                          rows={2}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="flex gap-2">
                                  <Button type="button" variant="outline" onClick={() => {
                                    setShowMailroomForm(false);
                                    setEditingMailroom(null);
                                    mailroomForm.reset();
                                  }}>
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={createMailroomMutation.isPending || updateMailroomMutation.isPending}>
                                    {editingMailroom 
                                      ? (updateMailroomMutation.isPending ? "Updating..." : "Update Mailroom")
                                      : (createMailroomMutation.isPending ? "Creating..." : "Create Mailroom")
                                    }
                                  </Button>
                                </div>
                              </div>
                            </form>
                          </Form>
                        </Card>
                      )}

                      {/* Display existing mailrooms */}
                      {mailrooms.length > 0 && (
                        <div className="space-y-4">
                          <h5 className="font-medium text-gray-900">Your Mailrooms</h5>
                          <div className="grid gap-4">
                            {mailrooms.map((mailroom: any) => {
                              const mailroomLocations = locations.filter((loc: any) => loc.mailroomId === mailroom.id);
                              return (
                                <Card key={mailroom.id} className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h6 className="font-medium text-gray-900">{mailroom.name}</h6>
                                        {mailroom.description && (
                                          <p className="text-sm text-gray-600 mt-1">{mailroom.description}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedMailroomId(mailroom.id);
                                            setShowLocationForm(true);
                                          }}
                                        >
                                          <Plus className="w-4 h-4 mr-2" />
                                          Add Storage
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setEditingMailroom(mailroom);
                                            mailroomForm.reset({
                                              name: mailroom.name,
                                              description: mailroom.description || "",
                                            });
                                            setShowMailroomForm(true);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to delete "${mailroom.name}"? This action cannot be undone.`)) {
                                              deleteMailroomMutation.mutate(mailroom.id);
                                            }
                                          }}
                                          disabled={deleteMailroomMutation.isPending}
                                        >
                                          {deleteMailroomMutation.isPending ? "Deleting..." : "Delete"}
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Show storage locations */}
                                    {mailroomLocations.length > 0 && (
                                      <div className="border-t pt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Storage Locations:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {mailroomLocations.map((location: any) => (
                                            <div key={location.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                              <span className="text-sm text-gray-600">
                                                {location.name} ({location.type})
                                              </span>
                                              <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 w-6 p-0 text-red-600"
                                                onClick={() => {
                                                  if (confirm(`Delete "${location.name}"?`)) {
                                                    deleteLocationMutation.mutate(location.id);
                                                  }
                                                }}
                                                disabled={deleteLocationMutation.isPending}
                                              >
                                                ×
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {showLocationForm && (
                        <Card className="p-4 bg-gray-50">
                          <Form {...locationForm}>
                            <form 
                              onSubmit={locationForm.handleSubmit((data) => createLocationMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={locationForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Location Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Bin A1, Shelf 2-B" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={locationForm.control}
                                  name="type"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Storage Type</FormLabel>
                                      <FormControl>
                                        <select {...field} className="w-full px-3 py-2 border rounded-lg">
                                          <option value="bin">Bin</option>
                                          <option value="shelf">Shelf</option>
                                          <option value="locker">Locker</option>
                                          <option value="cabinet">Cabinet</option>
                                        </select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={locationForm.control}
                                name="mailroomId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Parent Mailroom</FormLabel>
                                    <FormControl>
                                      <select {...field} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">Select mailroom...</option>
                                        {mailrooms.map((mailroom: any) => (
                                          <option key={mailroom.id} value={mailroom.id}>
                                            {mailroom.name}
                                          </option>
                                        ))}
                                      </select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={locationForm.control}
                                  name="capacity"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Capacity</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          placeholder="20" 
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={locationForm.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes (Optional)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Additional notes..." {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  type="submit" 
                                  disabled={createLocationMutation.isPending}
                                  className="flex-1"
                                >
                                  {createLocationMutation.isPending ? "Creating..." : "Create Location"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </Card>
                      )}
                      
                      {!mailrooms.length && (
                        <div className="text-center py-8">
                          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your Mailroom Hierarchy</h3>
                          <p className="text-gray-600 mb-2">Start by creating a mailroom, then add storage locations inside it</p>
                          <p className="text-sm text-gray-500">Example: Main Mailroom → Bin A1, Shelf B2, Locker C3</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Management */}
              <TabsContent value="users">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <User className="w-6 h-6 text-primary mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">User Management & Licensing</h3>
                          <p className="text-gray-600">Manage users and organization licenses</p>
                        </div>
                      </div>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Invite User
                      </Button>
                    </div>

                    {/* License Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">1</div>
                            <div className="text-sm text-blue-600">Active Users</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">5</div>
                            <div className="text-sm text-green-600">License Limit</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">4</div>
                            <div className="text-sm text-orange-600">Available Seats</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Current Users */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Current Users</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="grid grid-cols-4 text-sm font-medium text-gray-700">
                            <div>Name</div>
                            <div>Email</div>
                            <div>Role</div>
                            <div>Actions</div>
                          </div>
                        </div>
                        <div className="divide-y">
                          <div className="px-4 py-3">
                            <div className="grid grid-cols-4 text-sm">
                              <div className="font-medium">You</div>
                              <div className="text-gray-600">samerth.pathak@codsphere.ca</div>
                              <div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Admin
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs">Cannot remove</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade License */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Need more user seats?</h4>
                          <p className="text-sm text-gray-600">Upgrade your license to add more team members</p>
                        </div>
                        <Button variant="outline">
                          Upgrade License
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Settings */}
              <TabsContent value="account">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <User className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                        <p className="text-gray-600">Manage your personal account preferences</p>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">User account settings</p>
                      <p className="text-sm text-gray-400">
                        Manage your profile, preferences, and account security.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <Shield className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                        <p className="text-gray-600">Configure security and access controls</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                        </div>
                        <Switch />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Session Timeout</h4>
                          <p className="text-sm text-gray-600">Automatically log out after inactivity</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Login Notifications</h4>
                          <p className="text-sm text-gray-600">Get notified of new login attempts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </>
  );
}
