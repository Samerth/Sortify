import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Mail, MessageSquare, Webhook, Settings, Trash2, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIntegrationSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const integrationFormSchema = insertIntegrationSchema.extend({
  organizationId: z.string().optional(),
  config: z.object({
    apiKey: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    emailSettings: z.object({
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    }).optional(),
    smsSettings: z.object({
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      fromNumber: z.string().optional(),
    }).optional(),
  }).optional(),
});

type IntegrationFormData = z.infer<typeof integrationFormSchema>;

interface Integration {
  id: string;
  name: string;
  type: string;
  config: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const integrationTypes = [
  { value: "email", label: "Email Notifications", icon: Mail, description: "Send email notifications to recipients" },
  { value: "sms", label: "SMS Notifications", icon: MessageSquare, description: "Send SMS alerts for urgent deliveries" },
  { value: "webhook", label: "Webhook", icon: Webhook, description: "HTTP callbacks for external systems" },
  { value: "api", label: "API Integration", icon: ExternalLink, description: "Connect with external APIs" },
];

export default function Integrations() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      name: "",
      type: "email",
      isActive: true,
      config: {},
    },
  });

  const selectedType = form.watch("type");

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const response = await fetch("/api/integrations", {
        headers: {
          "X-Organization-Id": currentOrganization!.id,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch integrations");
      return response.json();
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      return apiRequest("POST", "/api/integrations", {
        ...data,
        organizationId: currentOrganization!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Success",
        description: "Integration created successfully.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create integration.",
        variant: "destructive",
      });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IntegrationFormData> }) => {
      return apiRequest("PUT", `/api/integrations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Success",
        description: "Integration updated successfully.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update integration.",
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/integrations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Success",
        description: "Integration deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete integration.",
        variant: "destructive",
      });
    },
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/integrations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Success",
        description: "Integration status updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update integration status.",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIntegration(null);
    form.reset();
  };

  const handleEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    form.reset({
      name: integration.name,
      type: integration.type,
      isActive: integration.isActive,
      config: integration.config || {},
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: IntegrationFormData) => {
    if (editingIntegration) {
      updateIntegrationMutation.mutate({ id: editingIntegration.id, data });
    } else {
      createIntegrationMutation.mutate(data);
    }
  };

  const handleDeleteIntegration = (id: string) => {
    if (confirm("Are you sure you want to delete this integration?")) {
      deleteIntegrationMutation.mutate(id);
    }
  };

  const handleToggleIntegration = (id: string, isActive: boolean) => {
    toggleIntegrationMutation.mutate({ id, isActive });
  };

  const getIntegrationIcon = (type: string) => {
    const integrationType = integrationTypes.find(t => t.value === type);
    return integrationType?.icon || Settings;
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
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600">Connect with external services and APIs</p>
          </div>
          <div className="flex items-center space-x-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-dark">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingIntegration ? "Edit Integration" : "Add New Integration"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Integration Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Email Integration" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {integrationTypes.map((type) => (
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
                    </div>

                    {/* Dynamic Configuration Fields */}
                    {selectedType === "email" && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Email Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="config.emailSettings.smtpHost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Host</FormLabel>
                                <FormControl>
                                  <Input placeholder="smtp.gmail.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="config.emailSettings.smtpPort"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMTP Port</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="587" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="config.emailSettings.username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="your-email@gmail.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="config.emailSettings.password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="App password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {selectedType === "sms" && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">SMS Configuration</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="config.smsSettings.accountSid"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Account SID</FormLabel>
                                <FormControl>
                                  <Input placeholder="Twilio Account SID" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="config.smsSettings.authToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Auth Token</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Auth Token" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="config.smsSettings.fromNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {selectedType === "webhook" && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Webhook Configuration</h4>
                        <FormField
                          control={form.control}
                          name="config.webhookUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Webhook URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://your-app.com/webhook" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {selectedType === "api" && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">API Configuration</h4>
                        <FormField
                          control={form.control}
                          name="config.apiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>API Key</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="API Key" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCloseDialog}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createIntegrationMutation.isPending || updateIntegrationMutation.isPending}
                      >
                        {createIntegrationMutation.isPending || updateIntegrationMutation.isPending 
                          ? "Saving..." 
                          : editingIntegration ? "Update Integration" : "Add Integration"
                        }
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
        {/* Available Integration Types */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrationTypes.map((type) => {
              const Icon = type.icon;
              const hasIntegration = integrations.some(int => int.type === type.value);
              
              return (
                <Card key={type.value} className={`cursor-pointer transition-all ${
                  hasIntegration ? "border-primary bg-primary/5" : "hover:border-gray-300"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Icon className={`w-6 h-6 ${hasIntegration ? "text-primary" : "text-gray-600"}`} />
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                    {hasIntegration && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        Configured
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Active Integrations */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="w-24 h-4 bg-gray-200 rounded"></div>
                      <div className="w-32 h-3 bg-gray-200 rounded"></div>
                      <div className="w-16 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No integrations configured yet</p>
                <p className="text-sm text-gray-400">
                  Add your first integration to start connecting with external services.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((integration) => {
                const Icon = getIntegrationIcon(integration.type);
                const integrationType = integrationTypes.find(t => t.value === integration.type);
                
                return (
                  <Card key={integration.id} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-6 h-6 text-primary" />
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <p className="text-sm text-gray-600">{integrationType?.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={integration.isActive}
                            onCheckedChange={(checked) => handleToggleIntegration(integration.id, checked)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="secondary"
                          className={integration.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                          }
                        >
                          {integration.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditIntegration(integration)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteIntegration(integration.id)}
                            disabled={deleteIntegrationMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
