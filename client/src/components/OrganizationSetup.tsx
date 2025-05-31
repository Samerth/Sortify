import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus } from "lucide-react";
import { insertOrganizationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type OrganizationFormData = {
  name: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export default function OrganizationSetup() {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(insertOrganizationSchema.pick({
      name: true,
      address: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    })),
    defaultValues: {
      name: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const createOrganization = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const response = await apiRequest("POST", "/api/organizations", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your organization has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    createOrganization.mutate(data);
  };

  if (!isCreating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to Sortify!</CardTitle>
            <CardDescription>
              Let's get you started by creating your first organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setIsCreating(true)}
              className="w-full"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            Set up your mailroom management system by creating your organization profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="e.g., Acme Corporation"
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="e.g., 123 Main St, City, State 12345"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                {...form.register("contactName")}
                placeholder="e.g., John Smith"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                {...form.register("contactEmail")}
                placeholder="e.g., admin@company.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                {...form.register("contactPhone")}
                placeholder="e.g., (555) 123-4567"
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreating(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createOrganization.isPending}
                className="flex-1"
              >
                {createOrganization.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}