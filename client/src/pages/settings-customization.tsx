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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit, Settings, Package, Truck, Mail, BarChart3, Save, X } from "lucide-react";
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

export default function SettingsCustomization() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<{ category: string; index: number; value: string } | null>(null);
  const [newItems, setNewItems] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery<OrganizationSettings>({
    queryKey: ['/api/organization-settings', currentOrganization?.id],
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

  if (!currentOrganization) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Please select an organization to continue.</p>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Customization Settings</h1>
            <p className="text-gray-600">Customize dropdown options and system behavior</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        <Tabs defaultValue="dropdowns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dropdowns">Dropdown Options</TabsTrigger>
            <TabsTrigger value="preferences">System Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="dropdowns" className="space-y-6">
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

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
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
        </Tabs>
      </div>
    </>
  );
}