import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { Link } from "wouter";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// TypeScript interface for our custom pricing component - no more Stripe Pricing Table

// Schemas for mailroom and storage location forms
const mailroomSchema = z.object({
  name: z.string().min(1, "Mailroom name is required"),
  description: z.string().optional(),
});

const storageLocationSchema = z.object({
  name: z.string().min(1, "Storage location name is required"),
  type: z.string().min(1, "Storage type is required"),
  mailroomId: z.string().min(1, "Parent mailroom is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  notes: z.string().optional(),
});

type MailroomFormData = z.infer<typeof mailroomSchema>;
type StorageLocationFormData = z.infer<typeof storageLocationSchema>;

// License-Based Pricing Plans
const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 25,
    description: 'Perfect for small teams',
    features: [
      'Unlimited users per license',
      '1,000 packages/month',
      'Basic reporting',
      'Email notifications',
      'Standard support'
    ],
    recommended: false
  },
  {
    id: 'professional', 
    name: 'Professional',
    price: 35,
    description: 'Best for growing businesses',
    features: [
      'Unlimited users per license',
      'Unlimited packages',
      'Advanced reporting & analytics',
      'Email & SMS notifications', 
      'Custom integrations',
      'Priority support'
    ],
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 45,
    description: 'For large organizations',
    features: [
      'Unlimited users per license',
      'Unlimited packages',
      'Advanced reporting & analytics',
      'Full API access',
      'Custom branding',
      'Dedicated account manager',
      '24/7 premium support'
    ],
    recommended: false
  }
];

// Custom License-Based Pricing Display Component
function StripePricingTableComponent() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  console.log('Custom pricing component loaded with:', {
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    userEmail: user?.email,
    orgId: currentOrganization?.id
  });

  const handleSubscribe = async (planId: string) => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Please select an organization first.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting subscription process for plan:', planId);
    setIsLoading(planId);
    
    try {
      const response = await apiRequest("POST", "/api/billing/create-checkout-session", {
        planId,
        organizationId: currentOrganization.id,
        customerEmail: user?.email || '',
      });
      
      const { url } = await response.json();
      console.log('Stripe checkout URL received:', url);
      window.open(url, '_blank');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Stripe configuration missing. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your License Plan</h3>
        <p className="text-sm text-gray-600">License-based pricing with unlimited users per license</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.recommended ? 'border-primary border-2' : ''}`}>
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-600">/license/month</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full"
                variant={plan.recommended ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading !== null}
              >
                {isLoading === plan.id ? "Processing..." : "Subscribe"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Subscription Management Button Component
function SubscriptionManagementButton() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!currentOrganization?.stripeCustomerId) {
      toast({
        title: "No Active Subscription",
        description: "Subscribe to a plan first to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/billing/create-portal-session", {
        customerId: currentOrganization.stripeCustomerId,
      });
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management portal.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full sm:w-auto"
      onClick={handleManageSubscription}
      disabled={isLoading}
    >
      {isLoading ? "Loading..." : "Manage Subscription"}
    </Button>
  );
}

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
  
  // Dialog state management
  const [showMailroomDialog, setShowMailroomDialog] = useState(false);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [selectedMailroomId, setSelectedMailroomId] = useState<string>("");
  
  // Form instances
  const mailroomForm = useForm<MailroomFormData>({
    resolver: zodResolver(mailroomSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  const storageLocationForm = useForm<StorageLocationFormData>({
    resolver: zodResolver(storageLocationSchema),
    defaultValues: {
      name: "",
      type: "bin",
      mailroomId: "",
      capacity: 20,
      notes: "",
    },
  });
  const [editingItem, setEditingItem] = useState<{ category: string; index: number; value: string } | null>(null);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [organizationForm, setOrganizationForm] = useState<Partial<Organization>>({});

  const { data: settings, isLoading: isLoadingSettings } = useQuery<OrganizationSettings>({
    queryKey: ['/api/organization-settings', currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/organization-settings", {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch organization settings");
      return response.json();
    },
  });

  // Use current organization data directly instead of fetching separately
  const organization = currentOrganization;
  const isLoadingOrg = false;

  // Update form when organization data loads
  useEffect(() => {
    if (organization) {
      setOrganizationForm({
        name: organization.name,
        address: organization.address || "",
        contactName: organization.contactName || "",
        contactEmail: organization.contactEmail || "",
        contactPhone: organization.contactPhone || "",
        logoUrl: organization.logoUrl || "",
      });
    }
  }, [organization]);

  const { data: organizationMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/organizations/${currentOrganization?.id}/members`],
    enabled: !!currentOrganization?.id,
  });
  
  // Mailrooms and storage locations queries
  const { data: mailrooms = [], refetch: refetchMailrooms } = useQuery({
    queryKey: ["/api/mailrooms"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/mailrooms", {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mailrooms");
      return response.json();
    },
  });

  const { data: storageLocations = [], refetch: refetchStorageLocations } = useQuery({
    queryKey: ["/api/mailroom-locations"],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/mailroom-locations", {
        headers: {
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch storage locations");
      return response.json();
    },
  });

  // Mutations for mailroom management
  const createMailroomMutation = useMutation({
    mutationFn: async (data: MailroomFormData) => {
      return await apiRequest("POST", "/api/mailrooms", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Mailroom created successfully",
      });
      refetchMailrooms();
      setShowMailroomDialog(false);
      mailroomForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create mailroom",
        variant: "destructive",
      });
    },
  });

  const createStorageLocationMutation = useMutation({
    mutationFn: async (data: StorageLocationFormData) => {
      return await apiRequest("POST", "/api/mailroom-locations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage location created successfully",
      });
      refetchStorageLocations();
      setShowStorageDialog(false);
      storageLocationForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create storage location",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onCreateMailroom = (data: MailroomFormData) => {
    createMailroomMutation.mutate(data);
  };

  const onCreateStorageLocation = (data: StorageLocationFormData) => {
    createStorageLocationMutation.mutate(data);
  };



  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<OrganizationSettings>) => {
      const response = await fetch("/api/organization-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": currentOrganization!.id,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organization-settings', currentOrganization!.id] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved.",
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
            {/* Billing & Subscription Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Billing & Subscription
                </CardTitle>
                <p className="text-sm text-gray-600">Manage your subscription and billing</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Plan Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{organizationMembers.length}</p>
                      <p className="text-sm text-gray-600">Active Users</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{organization?.planType || 'Trial'}</p>
                      <p className="text-sm text-gray-600">Current Plan</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{organization?.subscriptionStatus || 'Trial'}</p>
                      <p className="text-sm text-gray-600">Status</p>
                    </div>
                  </div>

                  {/* Stripe Pricing Table */}
                  <div className="stripe-pricing-container">
                    <StripePricingTableComponent />
                  </div>

                  {/* Subscription Management */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Subscription Management</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Manage your subscription, update payment methods, and view billing history through Stripe's secure customer portal.
                    </p>
                    <SubscriptionManagementButton />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* License Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  License Information
                </CardTitle>
                <p className="text-sm text-gray-600">Current subscription and license details</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Current Plan</p>
                      <p className="text-lg font-bold text-blue-900">
                        {organization?.planType || 'No Plan'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">Active Licenses</p>
                      <p className="text-lg font-bold text-green-900">
                        {organization?.maxUsers || 0}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Team Members</p>
                      <p className="text-lg font-bold text-purple-900">
                        {organizationMembers.length}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Link href="/settings-billing">
                      <Button variant="default" className="flex-1">
                        Manage Subscription
                      </Button>
                    </Link>
                    <Link href="/settings-billing">
                      <Button variant="outline" className="flex-1">
                        Upgrade Plan
                      </Button>
                    </Link>
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
                <p className="text-sm text-gray-600">Unlimited users per license - manage team members and roles</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Add unlimited team members with your current licenses
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
                  <Dialog open={showMailroomDialog} onOpenChange={setShowMailroomDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Mailroom
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New Mailroom</DialogTitle>
                      </DialogHeader>
                      <Form {...mailroomForm}>
                        <form onSubmit={mailroomForm.handleSubmit(onCreateMailroom)} className="space-y-4">
                          <FormField
                            control={mailroomForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mailroom Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Main Mailroom, Building A" {...field} />
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
                                  <Textarea placeholder="Description of the mailroom location..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowMailroomDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createMailroomMutation.isPending}>
                              {createMailroomMutation.isPending ? "Creating..." : "Create Mailroom"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {mailrooms.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No mailrooms configured yet. Create your first mailroom to organize package storage locations.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Your Mailrooms</h5>
                      {mailrooms.map((mailroom: any) => {
                        const mailroomStorageLocations = storageLocations.filter((loc: any) => loc.mailroomId === mailroom.id);
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
                                <Badge variant="outline">
                                  {mailroomStorageLocations.length} locations
                                </Badge>
                              </div>
                              
                              {mailroomStorageLocations.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {mailroomStorageLocations.map((location: any) => (
                                    <div key={location.id} className="p-2 bg-gray-50 rounded text-sm">
                                      <div className="font-medium">{location.name}</div>
                                      <div className="text-gray-600">
                                        {location.type} • {location.currentCount}/{location.capacity} capacity
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
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
                  <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        className="flex items-center gap-2"
                        disabled={mailrooms.length === 0}
                      >
                        <Plus className="w-4 h-4" />
                        Add Storage Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create Storage Location</DialogTitle>
                      </DialogHeader>
                      <Form {...storageLocationForm}>
                        <form onSubmit={storageLocationForm.handleSubmit(onCreateStorageLocation)} className="space-y-4">
                          <FormField
                            control={storageLocationForm.control}
                            name="mailroomId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Parent Mailroom</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select mailroom..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {mailrooms.map((mailroom: any) => (
                                        <SelectItem key={mailroom.id} value={mailroom.id}>
                                          {mailroom.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={storageLocationForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Location Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Bin A1, Shelf B2" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={storageLocationForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Type</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="bin">Bin</SelectItem>
                                        <SelectItem value="shelf">Shelf</SelectItem>
                                        <SelectItem value="locker">Locker</SelectItem>
                                        <SelectItem value="cold_storage">Cold Storage</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={storageLocationForm.control}
                              name="capacity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Capacity</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="20" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={storageLocationForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Additional notes about this storage location..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowStorageDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createStorageLocationMutation.isPending}>
                              {createStorageLocationMutation.isPending ? "Creating..." : "Create Location"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {mailrooms.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Create a mailroom first before adding storage locations.
                    </p>
                  ) : storageLocations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No storage locations configured yet. Add bins, shelves, or storage areas to track package placement.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {storageLocations.map((location: any) => {
                        const mailroom = mailrooms.find((m: any) => m.id === location.mailroomId);
                        return (
                          <Card key={location.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h6 className="font-medium text-sm">{location.name}</h6>
                                <Badge variant="outline" className="text-xs">
                                  {location.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600">
                                {mailroom?.name}
                              </p>
                              <div className="text-xs text-gray-600">
                                Capacity: {location.currentCount}/{location.capacity}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
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