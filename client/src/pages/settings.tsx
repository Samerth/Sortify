import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import BillingContent from "@/components/BillingContent";
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
  Plus,
  Mail
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrganizationSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertOrganizationSettingsSchema } from "@shared/schema";
import { Trash2, Edit3 } from "lucide-react";

const organizationFormSchema = insertOrganizationSchema.partial();
type OrganizationFormData = z.infer<typeof organizationFormSchema>;

const accountFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.currentPassword || data.newPassword || data.confirmPassword) {
    if (!data.currentPassword) return false;
    if (!data.newPassword || data.newPassword.length < 8) return false;
    if (data.newPassword !== data.confirmPassword) return false;
  }
  return true;
}, {
  message: "Password requirements: current password required, new password must be at least 8 characters, passwords must match",
  path: ["newPassword"],
});
type AccountFormData = z.infer<typeof accountFormSchema>;

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
  maxUsers?: number;
  maxPackagesPerMonth?: number;
  planType?: string;
  subscriptionStatus?: string;
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

// Customization Tab Component
interface CustomizationTabProps {
  organizationId: string;
}

function CustomizationTab({ organizationId }: CustomizationTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');

  // Fetch organization settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/organization-settings", organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organization-settings/${organizationId}`, {
        headers: { 'x-organization-id': organizationId },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const response = await apiRequest("PUT", `/api/organization-settings/${organizationId}`, updatedSettings);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Settings updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/organization-settings", organizationId] });
      setEditingSection(null);
      setNewValue('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating settings", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addValue = (section: keyof typeof settings, value: string) => {
    if (!settings || !value.trim()) return;
    
    const currentValues = settings[section] || [];
    if (currentValues.includes(value.trim())) {
      toast({ 
        title: "Value already exists", 
        description: `"${value}" is already in the list`,
        variant: "destructive" 
      });
      return;
    }
    
    const newValues = [...currentValues, value.trim()];
    updateSettingsMutation.mutate({ [section]: newValues });
  };

  const removeValue = (section: keyof typeof settings, valueToRemove: string) => {
    if (!settings) return;
    
    const currentValues = settings[section] || [];
    const newValues = currentValues.filter((v: string) => v !== valueToRemove);
    updateSettingsMutation.mutate({ [section]: newValues });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    {
      key: 'packageTypes',
      title: 'Package Types',
      description: 'Configure the types of packages your organization handles',
      values: settings?.packageTypes || [],
    },
    {
      key: 'packageSizes',
      title: 'Package Sizes',
      description: 'Define size categories for your packages',
      values: settings?.packageSizes || [],
    },
    {
      key: 'courierCompanies',
      title: 'Courier Companies',
      description: 'List of courier companies that deliver to your organization',
      values: settings?.courierCompanies || [],
    },
    {
      key: 'customStatuses',
      title: 'Custom Statuses',
      description: 'Define custom status options for mail tracking',
      values: settings?.customStatuses || [],
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center mb-6">
          <SettingsIcon className="w-6 h-6 text-primary mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customization</h3>
            <p className="text-gray-600">Configure dropdown options and custom values for your organization</p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.key} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-md font-medium text-gray-900">{section.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSection(section.key);
                    setNewValue('');
                  }}
                  disabled={updateSettingsMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Values List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                {section.values.map((value: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 border rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{value}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeValue(section.key as keyof typeof settings, value)}
                      disabled={updateSettingsMutation.isPending}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add New Value Form */}
              {editingSection === section.key && (
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder={`Add new ${section.title.toLowerCase()}...`}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addValue(section.key as keyof typeof settings, newValue);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addValue(section.key as keyof typeof settings, newValue)}
                    disabled={updateSettingsMutation.isPending || !newValue.trim()}
                    size="sm"
                  >
                    {updateSettingsMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSection(null);
                      setNewValue('');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Preferences Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">System Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Photo Upload</label>
                <p className="text-xs text-gray-500">Require staff to upload photos when logging packages</p>
              </div>
              <Switch
                checked={settings?.requirePhotoUpload || false}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ requirePhotoUpload: checked })
                }
                disabled={updateSettingsMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-Notify Recipients</label>
                <p className="text-xs text-gray-500">Automatically send notifications when mail arrives</p>
              </div>
              <Switch
                checked={settings?.autoNotifyRecipients !== false}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ autoNotifyRecipients: checked })
                }
                disabled={updateSettingsMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Allow Edit After Delivery</label>
                <p className="text-xs text-gray-500">Allow staff to edit mail details after marking as delivered</p>
              </div>
              <Switch
                checked={settings?.allowEditAfterDelivery || false}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ allowEditAfterDelivery: checked })
                }
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Fetch organization members for license count
  const { data: organizationMembers = [] } = useQuery({
    queryKey: [`/api/organizations/${currentOrganization?.id}/members`],
    enabled: !!currentOrganization?.id,
    refetchInterval: 10000, // Refetch every 10 seconds to catch subscription updates
    refetchOnWindowFocus: true,
  });

  // Fetch complete organization data with all fields including maxUsers
  const { data: fullOrganizationData } = useQuery<Organization>({
    queryKey: [`/api/organizations/${currentOrganization?.id}`],
    enabled: !!currentOrganization?.id,
    refetchInterval: 10000, // Refetch every 10 seconds to catch subscription updates
    refetchOnWindowFocus: true,
  });

  const memberCount = Array.isArray(organizationMembers) ? organizationMembers.length : 0;
  
  // Get the actual max users value with proper fallback
  const actualMaxUsers = (fullOrganizationData as any)?.maxUsers || currentOrganization?.maxUsers || 0;
  
  // Get current user's role in the organization
  const currentUserMember = Array.isArray(organizationMembers) 
    ? organizationMembers.find((member: any) => member.userId === user?.id)
    : null;
  const userRole = currentUserMember?.role || 'member';
  const isAdmin = userRole === 'admin';

  // Fetch pending invitations
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['/api/user-invitations'],
    enabled: !!currentOrganization?.id && isAdmin,
  });

  // Set default tab based on user role
  React.useEffect(() => {
    if (!isAdmin && activeTab === "organization") {
      setActiveTab("notifications");
    }
  }, [isAdmin, activeTab]);

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/user-invitations", data);
      const responseText = await res.text();
      console.log("Raw response:", responseText);
      try {
        return JSON.parse(responseText);
      } catch (error) {
        console.error("JSON parse error:", error);
        console.error("Response text:", responseText);
        throw new Error("Invalid JSON response from server");
      }
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The team member will receive an email invitation to join your organization.",
      });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest("POST", `/api/user-invitations/${invitationId}/resend`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent!",
        description: "A new invitation email has been sent.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      logoUrl: "",
    },
  });

  const accountForm = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
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

  // Update account form when user data is loaded
  React.useEffect(() => {
    if (user) {
      accountForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user, accountForm]);

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

  const updateAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return apiRequest("PATCH", "/api/auth/user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Account updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update account.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
      // Clear password fields
      accountForm.setValue("currentPassword", "");
      accountForm.setValue("newPassword", "");
      accountForm.setValue("confirmPassword", "");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    const currentPassword = accountForm.getValues("currentPassword");
    const newPassword = accountForm.getValues("newPassword");
    const confirmPassword = accountForm.getValues("confirmPassword");

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

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
      <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm md:text-base text-gray-600 hidden sm:block">Manage your organization's settings and preferences</p>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            {activeTab === "organization" && isAdmin && (
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateOrganizationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 md:px-4 py-2 text-sm md:text-base"
              >
                <Save className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">{updateOrganizationMutation.isPending ? "Saving..." : "Save Changes"}</span>
                <span className="sm:hidden">{updateOrganizationMutation.isPending ? "..." : "Save"}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-2 md:p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
                  <TabsList className={`grid w-full h-auto ${isAdmin ? 'grid-rows-6' : 'grid-rows-4'} gap-1`}>
                    {isAdmin && (
                      <TabsTrigger 
                        value="organization" 
                        className="justify-start px-2 md:px-3 py-2 text-sm"
                      >
                        <Building className="w-4 h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Organization</span>
                        <span className="sm:hidden">Org</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="customization" 
                      className="justify-start px-2 md:px-3 py-2 text-sm"
                    >
                      <SettingsIcon className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Customization</span>
                      <span className="sm:hidden">Custom</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="notifications" 
                      className="justify-start px-2 md:px-3 py-2 text-sm"
                    >
                      <Bell className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Notifications</span>
                      <span className="sm:hidden">Alerts</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="mailrooms" 
                      className="justify-start px-2 md:px-3 py-2 text-sm"
                    >
                      <MapPin className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Mailrooms</span>
                      <span className="sm:hidden">Rooms</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="account" 
                      className="justify-start px-2 md:px-3 py-2 text-sm"
                    >
                      <User className="w-4 h-4 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Account</span>
                      <span className="sm:hidden">Profile</span>
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger 
                        value="users" 
                        className="justify-start px-2 md:px-3 py-2 text-sm"
                      >
                        <User className="w-4 h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">User Management</span>
                        <span className="sm:hidden">Users</span>
                      </TabsTrigger>
                    )}
                    {isAdmin && (
                      <TabsTrigger 
                        value="billing" 
                        className="justify-start px-2 md:px-3 py-2 text-sm"
                      >
                        <Shield className="w-4 h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">Billing & Plans</span>
                        <span className="sm:hidden">Billing</span>
                      </TabsTrigger>
                    )}

                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab}>
              {/* Organization Settings */}
              {isAdmin && (
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
              )}

              {/* Customization */}
              <TabsContent value="customization">
                <CustomizationTab organizationId={currentOrganization.id} />
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
              {isAdmin && (
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
                      <Button onClick={() => setShowInviteDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Invite User
                      </Button>
                    </div>

                    {/* License Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{memberCount}</div>
                            <div className="text-sm text-blue-600">Active Users</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{actualMaxUsers === -1 ? '∞' : actualMaxUsers || 'Loading...'}</div>
                            <div className="text-sm text-green-600">License Limit</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{actualMaxUsers === -1 ? '∞' : Math.max(0, actualMaxUsers - memberCount)}</div>
                            <div className="text-sm text-orange-600">Available Seats</div>
                            <div className="text-xs text-gray-600 mt-1">
                              ({pendingInvitations?.length || 0} pending)
                            </div>
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
                          {Array.isArray(organizationMembers) && organizationMembers.map((member: any) => (
                            <div key={member.id} className="px-4 py-3">
                              <div className="grid grid-cols-4 text-sm">
                                <div className="font-medium">
                                  {member.user?.firstName || member.user?.lastName 
                                    ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim()
                                    : member.userId === user?.id ? 'You' : 'User'
                                  }
                                </div>
                                <div className="text-gray-600">{member.user?.email || 'No email'}</div>
                                <div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    member.role === 'admin' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {member.role === 'admin' ? 'Admin' : 'Member'}
                                  </span>
                                </div>
                                <div>
                                  {member.userId === user?.id ? (
                                    <span className="text-gray-400 text-xs">Cannot remove</span>
                                  ) : (
                                    <button className="text-red-600 text-xs hover:text-red-800">
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pending Invitations Section */}
                    {isAdmin && Array.isArray(pendingInvitations) && pendingInvitations.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-base font-medium text-gray-900 mb-4">Pending Invitations</h4>
                        <div className="border rounded-lg">
                          <div className="border-b bg-gray-50">
                            <div className="px-4 py-3">
                              <div className="grid grid-cols-4 text-sm font-medium text-gray-700">
                                <div>Email</div>
                                <div>Role</div>
                                <div>Expires</div>
                                <div>Actions</div>
                              </div>
                            </div>
                          </div>
                          <div className="divide-y">
                            {pendingInvitations.map((invitation: any) => (
                              <div key={invitation.id} className="px-4 py-3">
                                <div className="grid grid-cols-4 text-sm">
                                  <div className="font-medium text-gray-900">{invitation.email}</div>
                                  <div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      invitation.role === 'admin' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {invitation.role === 'admin' ? 'Admin' : 'Member'}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {new Date(invitation.expiresAt).toLocaleDateString()}
                                  </div>
                                  <div>
                                    <button 
                                      onClick={() => resendInvitationMutation.mutate(invitation.id)}
                                      disabled={resendInvitationMutation.isPending}
                                      className="text-blue-600 text-xs hover:text-blue-800 disabled:opacity-50"
                                    >
                                      {resendInvitationMutation.isPending ? 'Sending...' : 'Resend'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
                </TabsContent>
              )}

              {/* Account Settings */}
              <TabsContent value="account">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <User className="w-6 h-6 text-primary mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Account Settings</h3>
                        <p className="text-gray-600">Manage your personal account information</p>
                      </div>
                    </div>

                    <Form {...accountForm}>
                      <form onSubmit={accountForm.handleSubmit((data) => {
                        // Only update profile information (firstName, lastName)
                        updateAccountMutation.mutate({
                          firstName: data.firstName,
                          lastName: data.lastName
                        });
                      })} className="space-y-6">
                        {/* User Profile Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={accountForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter your first name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={accountForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter your last name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                          <Button type="submit" disabled={updateAccountMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            {updateAccountMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>

                        {/* Change Password Section */}
                        <div className="border-t pt-6">
                          <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
                          <div className="space-y-4">
                            <FormField
                              control={accountForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="Enter current password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={accountForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="Enter new password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={accountForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="Confirm new password"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              className="w-full"
                              onClick={handlePasswordChange}
                              disabled={changePasswordMutation.isPending}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </Form>

                    <div className="space-y-6">
                      {/* Email Address - Read Only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          value={user?.email || ""}
                          readOnly
                          className="bg-gray-50"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Your email address is managed through your authentication provider
                        </p>
                      </div>

                      {/* Account Status */}
                      <div className="border-t pt-6">
                        <h4 className="font-medium text-gray-900 mb-4">Account Status</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Account Type</span>
                              <p className="text-sm text-gray-500">Current account privileges</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Member Since</span>
                              <p className="text-sm text-gray-500">Account creation date</p>
                            </div>
                            <span className="text-sm text-gray-600">
                              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>



                      {/* Privacy Notice */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Shield className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-blue-800">Privacy & Security</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Your account information is securely managed and encrypted. 
                              Contact your administrator for any account changes.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing & Plans */}
              {isAdmin && (
                <TabsContent value="billing">
                  <BillingContent />
                </TabsContent>
              )}

            </Tabs>
          </div>
        </div>
      </main>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                placeholder="colleague@company.com"
                className="mt-1"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Access Control:</strong> Members can view and manage mail items. Admins can also manage users, settings, and organization configuration.
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>License Check:</strong> You have {actualMaxUsers === -1 ? '∞' : Math.max(0, actualMaxUsers - memberCount)} available seats remaining ({memberCount}/{actualMaxUsers === -1 ? '∞' : actualMaxUsers} used).
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Note: Pending invitations don't count against license seats until users register.
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowInviteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={() => inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole })}
                disabled={!inviteEmail || inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
