import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMailItemSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const editMailItemSchema = insertMailItemSchema.partial().extend({
  id: z.string(),
});

type EditMailItemData = z.infer<typeof editMailItemSchema>;

interface MailItem {
  id: string;
  type: string;
  status: string;
  trackingNumber?: string;
  sender?: string;
  description?: string;
  arrivedAt: string;
  recipientId?: string;
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    unit?: string;
  };
}

interface EditMailItemDialogProps {
  mailItem: MailItem;
  isOpen: boolean;
  onClose: () => void;
}

export function EditMailItemDialog({ mailItem, isOpen, onClose }: EditMailItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organization settings for package types
  const { data: settings } = useQuery({
    queryKey: ['/api/organization-settings'],
  });

  // Get recipients for the select dropdown
  const { data: recipients } = useQuery<any[]>({
    queryKey: ['/api/recipients'],
  });

  const form = useForm<EditMailItemData>({
    resolver: zodResolver(editMailItemSchema),
    defaultValues: {
      id: mailItem.id,
      type: mailItem.type,
      status: mailItem.status,
      trackingNumber: mailItem.trackingNumber || "",
      sender: mailItem.sender || "",
      description: mailItem.description || "",
      recipientId: mailItem.recipientId,
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditMailItemData) => {
      const response = await apiRequest("PUT", `/api/mail-items/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mail-items'] });
      toast({
        title: "Mail Item Updated",
        description: "The mail item has been updated successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update mail item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditMailItemData) => {
    editMutation.mutate(data);
  };

  const packageTypes = settings?.packageTypes || [
    { value: "letter", label: "Letter" },
    { value: "package", label: "Package" },
    { value: "certified", label: "Certified Mail" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Mail Item
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select package type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packageTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="notified">Notified</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recipients?.map((recipient) => (
                          <SelectItem key={recipient.id} value={recipient.id}>
                            {recipient.firstName} {recipient.lastName}
                            {recipient.unit && ` - Unit ${recipient.unit}`}
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
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Who sent this mail?" 
                      />
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
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Enter tracking number" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      placeholder="Add any additional notes or description" 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}