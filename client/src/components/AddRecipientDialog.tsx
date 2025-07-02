import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/components/OrganizationProvider";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRecipientSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const recipientFormSchema = insertRecipientSchema;

type RecipientFormData = z.infer<typeof recipientFormSchema>;

interface AddRecipientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipientAdded?: (recipientId: string) => void;
}

export function AddRecipientDialog({ isOpen, onClose, onRecipientAdded }: AddRecipientDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const form = useForm<RecipientFormData>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: {
      organizationId: currentOrganization?.id || "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      unit: "",
      department: "",
      recipientType: "guest",
      isActive: true,
    },
  });

  // Update organizationId when dialog opens or organization changes
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      form.setValue("organizationId", currentOrganization.id);
    }
  }, [isOpen, currentOrganization?.id, form]);

  const addRecipientMutation = useMutation({
    mutationFn: async (data: RecipientFormData) => {
      const response = await apiRequest("POST", "/api/recipients", data);
      return response.json();
    },
    onSuccess: (newRecipient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipients'] });
      toast({
        title: "Recipient Added",
        description: "New recipient has been added successfully.",
      });
      
      // Call the callback with the new recipient ID if provided
      if (onRecipientAdded) {
        onRecipientAdded(newRecipient.id);
      }
      
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add recipient",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecipientFormData) => {
    console.log("AddRecipientDialog onSubmit called with:", data);
    addRecipientMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Recipient
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter first name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter last name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        value={field.value || ""} 
                        placeholder="recipient@example.com" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="(555) 123-4567" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit/Apartment</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., 101, A-5" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department/Company</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., Sales, Tech Corp" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="resident">Resident</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={addRecipientMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}