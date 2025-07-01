import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings, Plus, Trash2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const packageTypeSchema = z.object({
  value: z.string().min(1, "Package type is required"),
  label: z.string().min(1, "Display name is required"),
});

interface OrganizationSettings {
  id: string;
  organizationId: string;
  packageTypes: Array<{ value: string; label: string }>;
  otherSettings: any;
}

export default function OrganizationSettings() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPackageType, setNewPackageType] = useState({ value: "", label: "" });

  const { data: settings, isLoading } = useQuery<OrganizationSettings>({
    queryKey: ['/api/organization-settings'],
    enabled: !!currentOrganization,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/organization-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organization-settings'] });
      toast({
        title: "Settings Updated",
        description: "Organization settings have been saved successfully.",
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

  const addPackageType = () => {
    if (!newPackageType.value.trim() || !newPackageType.label.trim()) {
      toast({
        title: "Invalid Input",
        description: "Both value and label are required",
        variant: "destructive",
      });
      return;
    }

    const currentPackageTypes = settings?.packageTypes || [];
    
    // Check for duplicates
    if (currentPackageTypes.some(pt => pt.value === newPackageType.value)) {
      toast({
        title: "Duplicate Value",
        description: "This package type value already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedPackageTypes = [...currentPackageTypes, newPackageType];
    
    updateSettingsMutation.mutate({
      packageTypes: updatedPackageTypes,
      otherSettings: settings?.otherSettings || {},
    });

    setNewPackageType({ value: "", label: "" });
  };

  const removePackageType = (valueToRemove: string) => {
    const currentPackageTypes = settings?.packageTypes || [];
    const updatedPackageTypes = currentPackageTypes.filter(pt => pt.value !== valueToRemove);
    
    updateSettingsMutation.mutate({
      packageTypes: updatedPackageTypes,
      otherSettings: settings?.otherSettings || {},
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Organization Settings</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* Package Types Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Package Types
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Customize the package types available in your mail intake forms.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Package Types */}
            <div className="space-y-2">
              <h4 className="font-medium">Current Package Types:</h4>
              <div className="flex flex-wrap gap-2">
                {settings?.packageTypes?.map((packageType) => (
                  <Badge key={packageType.value} variant="secondary" className="flex items-center gap-2">
                    {packageType.label}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removePackageType(packageType.value)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                )) || [
                  <Badge key="letter" variant="secondary">Letter</Badge>,
                  <Badge key="package" variant="secondary">Package</Badge>,
                  <Badge key="certified" variant="secondary">Certified Mail</Badge>
                ]}
              </div>
            </div>

            {/* Add New Package Type */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Add New Package Type:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Value (Internal)</label>
                  <Input
                    placeholder="e.g., express_delivery"
                    value={newPackageType.value}
                    onChange={(e) => setNewPackageType({ ...newPackageType, value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    placeholder="e.g., Express Delivery"
                    value={newPackageType.label}
                    onChange={(e) => setNewPackageType({ ...newPackageType, label: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={addPackageType}
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Type
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Future Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Other Settings</CardTitle>
            <p className="text-sm text-muted-foreground">
              Additional customization options will be available here.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">More customization options coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}