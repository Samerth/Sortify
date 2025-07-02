import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Package, 
  Truck, 
  Mail, 
  BarChart3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit,
  Building2,
  Palette,
  Cog,
  Shield,
  Users,
  Bell,
  Plug,
  UserMinus,
  UserPlus,
  Crown,
  MapPin
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface OrganizationSettings {
  id: string;
  organizationId: string;
  packageTypes: string[];
  packageSizes: string[];
  courierCompanies: string[];
  customStatuses: string[];
  allowEditAfterDelivery: boolean;
  requirePhotoUpload: boolean;
  autoNotifyRecipients: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  emailDomain?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  maxUsers?: number;
}

interface CustomizationCategory {
  key: keyof Pick<OrganizationSettings, 'packageTypes' | 'packageSizes' | 'courierCompanies' | 'customStatuses'>;
  title: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
}

const customizationCategories: CustomizationCategory[] = [
  {
    key: 'packageTypes',
    title: 'Package Types',
    description: 'Define different types of mail and packages',
    icon: <Package className="w-4 h-4" />,
    placeholder: 'e.g., Express Mail, Fragile, Documents'
  },
  {
    key: 'packageSizes',
    title: 'Package Sizes',
    description: 'Set available size options for packages',
    icon: <BarChart3 className="w-4 h-4" />,
    placeholder: 'e.g., Envelope, Box, Oversized'
  },
  {
    key: 'courierCompanies',
    title: 'Courier Companies',
    description: 'Manage delivery service providers',
    icon: <Truck className="w-4 h-4" />,
    placeholder: 'e.g., Local Courier, Same Day Delivery'
  },
  {
    key: 'customStatuses',
    title: 'Custom Statuses',
    description: 'Add custom tracking statuses for your workflow',
    icon: <Mail className="w-4 h-4" />,
    placeholder: 'e.g., Out for Delivery, Needs Signature'
  }
];

export default function SettingsUnified() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<{ category: string; index: number; value: string } | null>(null);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [organizationForm, setOrganizationForm] = useState<Partial<Organization>>({});

  const { data: settings, isLoading: isLoadingSettings } = useQuery<OrganizationSettings>({
    queryKey: ['/api/organization-settings', currentOrganization?.id],
    enabled: !!currentOrganization?.id,
  });

  const { data: organization, isLoading: isLoadingOrg } = useQuery<Organization>({
    queryKey: ['/api/organizations', currentOrganization?.id],
    enabled: !!currentOrganization?.id,
  });

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      setOrganizationForm(organization);
    }
  }, [organization]);

  const { data: organizationMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/members`],
    enabled: !!currentOrganization?.id,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<OrganizationSettings>) => {
      const response = await apiRequest("PATCH", `/api/organization-settings`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization-settings'] });
      toast({
        title: "Settings Updated",
        description: "Your customization settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      const response = await apiRequest("PATCH", `/api/organizations/${currentOrganization?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Organization Updated",
        description: "Organization details have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  const addItem = (category: string) => {
    const newValue = newItems[category];
    if (!newValue?.trim() || !settings) return;

    const currentItems = settings[category as keyof Pick<OrganizationSettings, 'packageTypes' | 'packageSizes' | 'courierCompanies' | 'customStatuses'>] as string[];
    
    if (currentItems.includes(newValue.trim())) {
      toast({
        title: "Duplicate Item",
        description: "This item already exists in the list.",
        variant: "destructive",
      });
      return;
    }

    const updatedItems = [...currentItems, newValue.trim()];
    updateSettingsMutation.mutate({
      [category]: updatedItems
    });

    setNewItems(prev => ({ ...prev, [category]: '' }));
  };

  const removeItem = (category: string, index: number) => {
    if (!settings) return;

    const currentItems = settings[category as keyof Pick<OrganizationSettings, 'packageTypes' | 'packageSizes' | 'courierCompanies' | 'customStatuses'>] as string[];
    const updatedItems = currentItems.filter((_, i) => i !== index);
    
    updateSettingsMutation.mutate({
      [category]: updatedItems
    });
  };

  const editItem = (category: string, index: number, newValue: string) => {
    if (!settings || !newValue.trim()) return;

    const currentItems = settings[category as keyof Pick<OrganizationSettings, 'packageTypes' | 'packageSizes' | 'courierCompanies' | 'customStatuses'>] as string[];
    
    if (currentItems.includes(newValue.trim()) && currentItems[index] !== newValue.trim()) {
      toast({
        title: "Duplicate Item",
        description: "This item already exists in the list.",
        variant: "destructive",
      });
      return;
    }

    const updatedItems = [...currentItems];
    updatedItems[index] = newValue.trim();
    
    updateSettingsMutation.mutate({
      [category]: updatedItems
    });

    setEditingItem(null);
  };

  const updateBooleanSetting = (key: keyof Pick<OrganizationSettings, 'allowEditAfterDelivery' | 'requirePhotoUpload' | 'autoNotifyRecipients'>, value: boolean) => {
    updateSettingsMutation.mutate({
      [key]: value
    });
  };

  const updateOrganization = () => {
    updateOrganizationMutation.mutate(organizationForm);
  };

  if (!currentOrganization) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to continue.</p>
      </div>
    );
  }

  const isLoading = isLoadingSettings || isLoadingOrg;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
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
            <p className="text-gray-600">Manage organization settings and customizations</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="customization" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Customization
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members & Licenses
            </TabsTrigger>
            <TabsTrigger value="mailrooms" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Mailrooms
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="w-4 h-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Organization Settings */}
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Organization Details
                </CardTitle>
                <p className="text-sm text-gray-600">Update your organization information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={organizationForm.name || ''}
                      onChange={(e) => setOrganizationForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emailDomain">Email Domain</Label>
                    <Input
                      id="emailDomain"
                      placeholder="company.com"
                      value={organizationForm.emailDomain || ''}
                      onChange={(e) => setOrganizationForm(prev => ({ ...prev, emailDomain: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={organizationForm.contactName || ''}
                      onChange={(e) => setOrganizationForm(prev => ({ ...prev, contactName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={organizationForm.contactEmail || ''}
                      onChange={(e) => setOrganizationForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={organizationForm.contactPhone || ''}
                      onChange={(e) => setOrganizationForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={organizationForm.address || ''}
                    onChange={(e) => setOrganizationForm(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={updateOrganization}
                  disabled={updateOrganizationMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateOrganizationMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customization Settings */}
          <TabsContent value="customization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {customizationCategories.map((category) => {
                const items = settings?.[category.key] as string[] || [];
                
                return (
                  <Card key={category.key}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {category.icon}
                        {category.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Add new item */}
                      <div className="flex gap-2">
                        <Input
                          placeholder={category.placeholder}
                          value={newItems[category.key] || ''}
                          onChange={(e) => setNewItems(prev => ({ 
                            ...prev, 
                            [category.key]: e.target.value 
                          }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addItem(category.key);
                            }
                          }}
                        />
                        <Button
                          onClick={() => addItem(category.key)}
                          disabled={!newItems[category.key]?.trim() || updateSettingsMutation.isPending}
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Existing items */}
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            {editingItem?.category === category.key && editingItem?.index === index ? (
                              <div className="flex gap-2 flex-1">
                                <Input
                                  value={editingItem.value}
                                  onChange={(e) => setEditingItem(prev => 
                                    prev ? { ...prev, value: e.target.value } : null
                                  )}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      editItem(category.key, index, editingItem.value);
                                    } else if (e.key === 'Escape') {
                                      setEditingItem(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => editItem(category.key, index, editingItem.value)}
                                  disabled={!editingItem.value.trim()}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1">{item}</span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingItem({ 
                                      category: category.key, 
                                      index, 
                                      value: item 
                                    })}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeItem(category.key, index)}
                                    disabled={updateSettingsMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {items.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No items added yet. Add your first item above.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* System Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="w-4 h-4" />
                  System Preferences
                </CardTitle>
                <p className="text-sm text-gray-600">Configure how your mailroom system behaves</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowEditAfterDelivery" className="text-base font-medium">
                      Allow Editing After Delivery
                    </Label>
                    <p className="text-sm text-gray-600">
                      Allow staff to edit mail items even after they've been marked as delivered
                    </p>
                  </div>
                  <Switch
                    id="allowEditAfterDelivery"
                    checked={settings?.allowEditAfterDelivery || false}
                    onCheckedChange={(checked) => updateBooleanSetting('allowEditAfterDelivery', checked)}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requirePhotoUpload" className="text-base font-medium">
                      Require Photo Upload
                    </Label>
                    <p className="text-sm text-gray-600">
                      Make photo upload mandatory when logging new mail items
                    </p>
                  </div>
                  <Switch
                    id="requirePhotoUpload"
                    checked={settings?.requirePhotoUpload || false}
                    onCheckedChange={(checked) => updateBooleanSetting('requirePhotoUpload', checked)}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoNotifyRecipients" className="text-base font-medium">
                      Auto-Notify Recipients
                    </Label>
                    <p className="text-sm text-gray-600">
                      Automatically send notifications when new mail arrives for recipients
                    </p>
                  </div>
                  <Switch
                    id="autoNotifyRecipients"
                    checked={settings?.autoNotifyRecipients || false}
                    onCheckedChange={(checked) => updateBooleanSetting('autoNotifyRecipients', checked)}
                    disabled={updateSettingsMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members & License Management */}
          <TabsContent value="members" className="space-y-6">
            {/* License Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  License Information
                </CardTitle>
                <p className="text-sm text-gray-600">Current plan and user limits</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{organizationMembers.length}</p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{organization?.maxUsers || 'Unlimited'}</p>
                    <p className="text-sm text-gray-600">User Limit</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">Active</p>
                    <p className="text-sm text-gray-600">License Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </CardTitle>
                <p className="text-sm text-gray-600">Manage team members and their roles</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      {organizationMembers.length} of {organization?.maxUsers || '∞'} user licenses used
                    </p>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Invite Member
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {organizationMembers.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {member.user?.firstName?.[0] || member.user?.email?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user?.firstName && member.user?.lastName 
                                ? `${member.user.firstName} ${member.user.lastName}`
                                : member.user?.email
                              }
                            </p>
                            <p className="text-sm text-gray-500">{member.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <UserMinus className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mailroom Settings */}
          <TabsContent value="mailrooms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Mailroom Configuration
                </CardTitle>
                <p className="text-sm text-gray-600">Set up physical mailroom locations and storage</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Mailroom
                  </Button>
                  <p className="text-sm text-gray-500">
                    No mailrooms configured yet. Create your first mailroom to organize package storage locations.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Storage Locations
                </CardTitle>
                <p className="text-sm text-gray-600">Manage bins, shelves, and storage areas</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Storage Location
                  </Button>
                  <p className="text-sm text-gray-500">
                    No storage locations configured yet. Add bins, shelves, or storage areas to track package placement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Email & SMS Notifications
                </CardTitle>
                <p className="text-sm text-gray-600">Configure notification services</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Configure Email
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Configure SMS
                  </Button>
                  <p className="text-sm text-gray-500">
                    Set up email and SMS integrations to automatically notify recipients about their mail.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}