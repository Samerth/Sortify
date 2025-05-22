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
import { Plus, Package, Mail, Bell, Check, Eye, Camera, QrCode, Upload, Trash2, ChevronDown, ChevronUp, MapPin, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface MailItem {
  id: string;
  type: string;
  status: string;
  trackingNumber?: string;
  sender?: string;
  arrivedAt: string;
  notifiedAt?: string;
  deliveredAt?: string;
  description?: string;
  notes?: string;
  photoUrl?: string;
  courierCompany?: string;
  collectorName?: string;
  locationId?: string;
  mailroomId?: string;
  recipient?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    unit?: string;
    department?: string;
  };
}

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  unit?: string;
}

export default function MailIntake() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "package",
    recipientId: "",
    locationId: "",
    sender: "",
    trackingNumber: "",
    description: "",
    courierCompany: "",
    collectedByStaff: "",
    collectorName: "",
    photo: null as File | null,
  });

  const [photoMethod, setPhotoMethod] = useState<'camera' | 'barcode' | 'upload'>('upload');
  const [isCapturing, setIsCapturing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: mailItems = [] } = useQuery({
    queryKey: ["/api/mail-items"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/mail-items", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mail items");
      return response.json();
    },
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ["/api/recipients"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/recipients", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch recipients");
      return response.json();
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/mailroom-locations"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/mailroom-locations", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
  });

  const { data: mailrooms = [] } = useQuery({
    queryKey: ["/api/mailrooms"],
    enabled: !!currentOrganization,
    queryFn: async () => {
      const response = await fetch("/api/mailrooms", {
        headers: {
          "x-organization-id": currentOrganization?.id || "",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch mailrooms");
      return response.json();
    },
  });

  const createMailItemMutation = useMutation({
    mutationFn: async (data: any) => {
      // Clean up data - convert empty strings to null for optional UUID fields
      // Separate locationId into either locationId or mailroomId based on selection
      const cleanedData = {
        ...data,
        locationId: (data.locationId && (locations as any[]).some(loc => loc.id === data.locationId)) ? data.locationId : null,
        mailroomId: (data.locationId && (mailrooms as any[]).some(room => room.id === data.locationId)) ? data.locationId : null,
        recipientId: data.recipientId || null,
        trackingNumber: data.trackingNumber || null,
        sender: data.sender || null,
        description: data.description || null,
        courierCompany: data.courierCompany || null,
        collectorName: data.collectorName || null,
      };

      // Handle photo upload if present
      if (formData.photo) {
        try {
          const photoFormData = new FormData();
          photoFormData.append('photo', formData.photo);
          
          const photoResponse = await fetch('/api/upload-photo', {
            method: 'POST',
            body: photoFormData,
            headers: {
              'x-organization-id': currentOrganization?.id || '',
            },
            credentials: 'include',
          });
          
          if (photoResponse.ok) {
            const { photoUrl } = await photoResponse.json();
            cleanedData.photoUrl = photoUrl;
          }
        } catch (error) {
          console.log('Photo upload failed, continuing without photo');
        }
      }

      // Remove the temporary locationId from cleanedData
      const { locationId: _, ...finalData } = cleanedData;

      const response = await fetch("/api/mail-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": currentOrganization?.id || "",
        },
        body: JSON.stringify(finalData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create mail item");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Mail item logged successfully.",
      });
      setIsDialogOpen(false);
      setFormData({
        type: "package",
        recipientId: "",
        locationId: "",
        sender: "",
        trackingNumber: "",
        description: "",
        courierCompany: "",
        collectedByStaff: "",
        collectorName: "",
        photo: null,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log mail item.",
        variant: "destructive",
      });
    },
  });

  const deleteMailItemMutation = useMutation({
    mutationFn: async (mailItemId: string) => {
      console.log(`🗑️ Frontend: Starting delete for item ${mailItemId}`);
      
      const response = await fetch(`/api/mail-items/${mailItemId}/delete`, {
        method: "POST",
        headers: {
          "x-organization-id": currentOrganization?.id || "",
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      console.log(`🗑️ Frontend: Delete response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🗑️ Frontend: Delete failed:`, errorText);
        throw new Error(`Failed to delete mail item: ${errorText}`);
      }
      
      try {
        const result = await response.json();
        console.log(`🗑️ Frontend: Delete response:`, result);
        return result;
      } catch (parseError) {
        console.log(`🗑️ Frontend: No JSON response, assuming success`);
        return { message: "Mail item deleted successfully" };
      }
    },
    onSuccess: (data, deletedItemId) => {
      toast({ title: "Mail item deleted successfully!" });
      // Use setQueryData to immediately update the cache
      queryClient.setQueryData(["/api/mail-items"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.filter((item: any) => item.id !== deletedItemId);
      });
      // Also invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-activity"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting mail item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMailItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/mail-items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": currentOrganization?.id || "",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update mail item");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mail-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Mail item updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update mail item.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMailItemMutation.mutate(formData);
  };

  const handleNotifyRecipient = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "notified", notifiedAt: new Date().toISOString() },
    });
  };

  const handleMarkDelivered = (id: string) => {
    updateMailItemMutation.mutate({
      id,
      data: { status: "delivered", deliveredAt: new Date().toISOString() },
    });
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "secondary" as const },
      notified: { label: "Notified", variant: "default" as const },
      delivered: { label: "Delivered", variant: "default" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mail Intake</h1>
          <p className="text-gray-600">Process and track incoming mail and packages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-dark">
              <Plus className="w-4 h-4 mr-2" />
              Log New Mail
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log New Mail Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="package">Package</option>
                  <option value="letter">Letter</option>
                  <option value="certified_mail">Certified Mail</option>
                  <option value="express">Express Mail</option>
                </select>
              </div>

              <div>
                <Label htmlFor="recipientId">Who is this package for?</Label>
                <p className="text-sm text-gray-500 mb-2">Select the guest, employee, or resident this mail belongs to</p>
                <select
                  id="recipientId"
                  value={formData.recipientId}
                  onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select recipient</option>
                  {(recipients as any[]).map((recipient: any) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.firstName} {recipient.lastName} 
                      {recipient.recipientType && ` (${recipient.recipientType.charAt(0).toUpperCase() + recipient.recipientType.slice(1)})`}
                      {recipient.unit && ` - Unit ${recipient.unit}`}
                      {recipient.department && ` - ${recipient.department}`}
                      {recipient.email && ` • ${recipient.email}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="locationId">Storage Location</Label>
                <p className="text-sm text-gray-500 mb-2">Assign package to a specific bin, shelf, or storage area</p>
                <select
                  id="locationId"
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {locations && locations.length > 0 ? (
                    <>
                      <option value="">Select storage location (optional)</option>
                      {(locations as any[]).map((location: any) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.type})
                          {location.currentCount !== undefined && location.capacity && 
                            ` - ${location.currentCount}/${location.capacity} items`}
                        </option>
                      ))}
                    </>
                  ) : mailrooms && mailrooms.length > 0 ? (
                    <>
                      <option value="">Select mailroom (optional)</option>
                      {(mailrooms as any[]).map((mailroom: any) => (
                        <option key={mailroom.id} value={mailroom.id}>
                          {mailroom.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="">No storage locations available - Create one in Settings</option>
                  )}
                </select>
              </div>

              <div>
                <Label htmlFor="sender">Sender</Label>
                <Input
                  id="sender"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                  placeholder="Enter sender name"
                />
              </div>

              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="Enter tracking number"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <Label htmlFor="courierCompany">Courier Company</Label>
                <select
                  id="courierCompany"
                  value={formData.courierCompany}
                  onChange={(e) => setFormData({ ...formData, courierCompany: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select courier</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                  <option value="dhl">DHL</option>
                  <option value="usps">USPS</option>
                  <option value="amazon">Amazon Delivery</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="collectorName">Who Collected This Package?</Label>
                <p className="text-sm text-gray-500 mb-2">Staff member who signed for the package</p>
                <Input
                  id="collectorName"
                  value={formData.collectorName}
                  onChange={(e) => setFormData({ ...formData, collectorName: e.target.value })}
                  placeholder="Staff member name"
                />
              </div>

              <div>
                <Label>Package Photo & Barcode</Label>
                <p className="text-sm text-gray-500 mb-3">Capture package image or scan barcode for verification</p>
                
                {/* Photo Method Selection */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Button
                    type="button"
                    variant={photoMethod === 'camera' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPhotoMethod('camera')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <Camera className="w-4 h-4 mb-1" />
                    <span className="text-xs">Take Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant={photoMethod === 'barcode' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPhotoMethod('barcode')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <QrCode className="w-4 h-4 mb-1" />
                    <span className="text-xs">Scan Barcode</span>
                  </Button>
                  <Button
                    type="button"
                    variant={photoMethod === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPhotoMethod('upload')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <Upload className="w-4 h-4 mb-1" />
                    <span className="text-xs">Upload File</span>
                  </Button>
                </div>

                {/* Camera Capture */}
                {photoMethod === 'camera' && (
                  <div className="space-y-3">
                    <div className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-green-300 bg-green-50 rounded-lg">
                      <Camera className="w-8 h-8 text-green-600" />
                      <div className="text-center">
                        <div className="font-medium text-green-700 mb-2">Camera Mode Active</div>
                        <Button
                          type="button"
                          onClick={async () => {
                            setIsCapturing(true);
                            
                            // Temporarily close dialog
                            const wasDialogOpen = isDialogOpen;
                            if (wasDialogOpen) setIsDialogOpen(false);
                            
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ 
                                video: { facingMode: 'environment' } 
                              });
                              
                              const overlay = document.createElement('div');
                              overlay.style.cssText = `
                                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                background: rgba(0,0,0,0.95); z-index: 999999; display: flex; 
                                flex-direction: column; align-items: center; justify-content: center;
                              `;
                              
                              const video = document.createElement('video');
                              video.srcObject = stream;
                              video.autoplay = true;
                              video.playsInline = true;
                              video.style.cssText = 'width: 90%; max-width: 400px; height: auto; border-radius: 8px;';
                              
                              const buttonContainer = document.createElement('div');
                              buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 15px;';
                              
                              const captureBtn = document.createElement('button');
                              captureBtn.textContent = '📸 Capture';
                              captureBtn.style.cssText = 'padding: 12px 24px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;';
                              
                              const cancelBtn = document.createElement('button');
                              cancelBtn.textContent = '❌ Cancel';
                              cancelBtn.style.cssText = 'padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;';
                              
                              const cleanup = () => {
                                stream.getTracks().forEach(track => track.stop());
                                document.body.removeChild(overlay);
                                setIsCapturing(false);
                                // Reopen dialog if it was open
                                if (wasDialogOpen) setTimeout(() => setIsDialogOpen(true), 100);
                              };
                              
                              captureBtn.onclick = () => {
                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                context?.drawImage(video, 0, 0);
                                
                                canvas.toBlob((blob) => {
                                  if (blob) {
                                    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                                    setFormData({ ...formData, photo: file });
                                    toast({ title: "Photo captured from camera!" });
                                  }
                                  cleanup();
                                }, 'image/jpeg', 0.8);
                              };
                              
                              cancelBtn.onclick = cleanup;
                              
                              buttonContainer.appendChild(captureBtn);
                              buttonContainer.appendChild(cancelBtn);
                              overlay.appendChild(video);
                              overlay.appendChild(buttonContainer);
                              document.body.appendChild(overlay);
                              
                            } catch (error) {
                              console.log('Camera not available, using file input');
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.capture = 'environment';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  setFormData({ ...formData, photo: file });
                                  toast({ title: "Photo selected!" });
                                }
                              };
                              input.click();
                              setIsCapturing(false);
                              // Reopen dialog if it was open
                              if (wasDialogOpen) setTimeout(() => setIsDialogOpen(true), 100);
                            }
                          }}
                          disabled={isCapturing}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Open Camera
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Tap "Open Camera" to take a photo of the package</p>
                  </div>
                )}

                {/* Barcode Scanner */}
                {photoMethod === 'barcode' && (
                  <div className="space-y-3">
                    <div className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg">
                      <QrCode className="w-8 h-8 text-blue-600" />
                      <div className="text-center">
                        <div className="font-medium text-blue-700 mb-2">Barcode Scanner Mode</div>
                        <Button
                          type="button"
                          onClick={async () => {
                            setIsCapturing(true);
                            
                            // Temporarily close dialog
                            const wasDialogOpen = isDialogOpen;
                            if (wasDialogOpen) setIsDialogOpen(false);
                            
                            try {
                              const stream = await navigator.mediaDevices.getUserMedia({ 
                                video: { facingMode: 'environment' } 
                              });
                              
                              const overlay = document.createElement('div');
                              overlay.style.cssText = `
                                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                                background: rgba(0,0,0,0.95); z-index: 999999; display: flex; 
                                flex-direction: column; align-items: center; justify-content: center;
                              `;
                              
                              const video = document.createElement('video');
                              video.srcObject = stream;
                              video.autoplay = true;
                              video.playsInline = true;
                              video.style.cssText = 'width: 90%; max-width: 400px; height: auto; border-radius: 8px;';
                              
                              const instructions = document.createElement('div');
                              instructions.textContent = '📱 Point camera at barcode or QR code';
                              instructions.style.cssText = 'color: white; font-size: 18px; margin-bottom: 15px; text-align: center;';
                              
                              const buttonContainer = document.createElement('div');
                              buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 15px;';
                              
                              const captureBtn = document.createElement('button');
                              captureBtn.textContent = '📷 Scan Barcode';
                              captureBtn.style.cssText = 'padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;';
                              
                              const cancelBtn = document.createElement('button');
                              cancelBtn.textContent = '❌ Cancel';
                              cancelBtn.style.cssText = 'padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;';
                              
                              const cleanup = () => {
                                stream.getTracks().forEach(track => track.stop());
                                document.body.removeChild(overlay);
                                setIsCapturing(false);
                                // Reopen dialog if it was open
                                if (wasDialogOpen) setTimeout(() => setIsDialogOpen(true), 100);
                              };
                              
                              captureBtn.onclick = () => {
                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                context?.drawImage(video, 0, 0);
                                
                                canvas.toBlob((blob) => {
                                  if (blob) {
                                    const file = new File([blob], 'barcode-scan.jpg', { type: 'image/jpeg' });
                                    setFormData({ ...formData, photo: file });
                                    toast({ title: "Barcode image captured!" });
                                  }
                                  cleanup();
                                }, 'image/jpeg', 0.8);
                              };
                              
                              cancelBtn.onclick = cleanup;
                              
                              buttonContainer.appendChild(captureBtn);
                              buttonContainer.appendChild(cancelBtn);
                              overlay.appendChild(instructions);
                              overlay.appendChild(video);
                              overlay.appendChild(buttonContainer);
                              document.body.appendChild(overlay);
                              
                            } catch (error) {
                              console.log('Camera not available, using file input');
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.capture = 'environment';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  setFormData({ ...formData, photo: file });
                                  toast({ title: "Barcode image selected!" });
                                }
                              };
                              input.click();
                              setIsCapturing(false);
                              // Reopen dialog if it was open
                              if (wasDialogOpen) setTimeout(() => setIsDialogOpen(true), 100);
                            }
                          }}
                          disabled={isCapturing}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Scan Barcode
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center">Scans barcodes and auto-fills tracking information</p>
                  </div>
                )}

                {/* File Upload */}
                {photoMethod === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-gray-500">Choose an existing photo from your device</p>
                  </div>
                )}

                {/* Photo Preview */}
                {formData.photo && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600 flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      Photo selected: {formData.photo.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMailItemMutation.isPending}
                  className="flex-1"
                >
                  {createMailItemMutation.isPending ? "Logging..." : "Log Mail"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Mail Items</CardTitle>
        </CardHeader>
        <CardContent>
          {mailItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No mail items yet. Start by logging your first mail item!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mailItems.map((item: MailItem) => (
                <div key={item.id} className="border rounded-lg bg-white">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        {item.type === "package" ? (
                          <Package className="w-5 h-5 text-gray-600" />
                        ) : (
                          <Mail className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {item.recipient ? 
                            `${item.recipient.firstName} ${item.recipient.lastName}` : 
                            "Unknown Recipient"
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.sender && `From: ${item.sender}`}
                          {item.trackingNumber && ` • ${item.trackingNumber}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(item.arrivedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(item.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpanded(item.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedItem === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expandable Details */}
                  {expandedItem === item.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm font-medium text-gray-700">
                            <User className="w-4 h-4 mr-2 text-gray-500" />
                            Recipient Details
                          </div>
                          {item.recipient && (
                            <div className="pl-6 text-sm text-gray-600 space-y-1">
                              <div className="font-medium">{item.recipient.firstName} {item.recipient.lastName}</div>
                              {item.recipient.email && <div>📧 {item.recipient.email}</div>}
                              {item.recipient.phone && <div>📞 {item.recipient.phone}</div>}
                              {item.recipient.unit && <div>🏠 Unit {item.recipient.unit}</div>}
                              {item.recipient.department && <div>🏢 {item.recipient.department}</div>}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center text-sm font-medium text-gray-700">
                            <Clock className="w-4 h-4 mr-2 text-gray-500" />
                            Timeline
                          </div>
                          <div className="pl-6 text-sm text-gray-600 space-y-1">
                            <div>📦 Arrived: {new Date(item.arrivedAt).toLocaleDateString()} at {new Date(item.arrivedAt).toLocaleTimeString()}</div>
                            {item.notifiedAt && <div>🔔 Notified: {new Date(item.notifiedAt).toLocaleDateString()} at {new Date(item.notifiedAt).toLocaleTimeString()}</div>}
                            {item.deliveredAt && <div>✅ Delivered: {new Date(item.deliveredAt).toLocaleDateString()} at {new Date(item.deliveredAt).toLocaleTimeString()}</div>}
                          </div>
                        </div>
                      </div>
                      
                      {item.description && (
                        <div className="mb-4">
                          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Package className="w-4 h-4 mr-2 text-gray-500" />
                            Description
                          </div>
                          <div className="pl-6 text-sm text-gray-600 bg-white p-2 rounded border">{item.description}</div>
                        </div>
                      )}
                      
                      {item.notes && (
                        <div className="mb-4">
                          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            📝 Notes
                          </div>
                          <div className="pl-6 text-sm text-gray-600 bg-white p-2 rounded border">{item.notes}</div>
                        </div>
                      )}
                      
                      {/* Package Info */}
                      {(item.courierCompany || item.collectorName || item.trackingNumber) && (
                        <div className="mb-4">
                          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Package className="w-4 h-4 mr-2 text-gray-500" />
                            Package Info
                          </div>
                          <div className="pl-6 text-sm text-gray-600 space-y-1">
                            {item.trackingNumber && <div>📋 Tracking: {item.trackingNumber}</div>}
                            {item.courierCompany && <div>🚚 Courier: {item.courierCompany}</div>}
                            {item.collectorName && <div>👤 Collected by: {item.collectorName}</div>}
                          </div>
                        </div>
                      )}
                      
                      {/* Storage Location */}
                      <div className="mb-4">
                        <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          Storage Location
                        </div>
                        <div className="pl-6 text-sm text-gray-600">
                          {(() => {
                            // Location lookup logic
                            
                            // Find the location name from the locations array
                            const location = (locations as any[])?.find(loc => loc.id === item.locationId);
                            if (location) {
                              return `📦 ${location.name} (${location.mailroomName || 'Storage Location'})`;
                            }
                            
                            // Find the mailroom name from the mailrooms array
                            const mailroom = (mailrooms as any[])?.find(room => room.id === item.mailroomId);
                            if (mailroom) {
                              return `🏢 ${mailroom.name} (Mailroom)`;
                            }
                            
                            return `📍 Location not specified`;
                          })()}
                        </div>
                      </div>
                      
                      {/* Photo Display */}
                      {item.photoUrl && (
                        <div className="mb-4">
                          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                            <Camera className="w-4 h-4 mr-2 text-gray-500" />
                            Package Photo
                          </div>
                          <div className="pl-6">
                            <img 
                              src={item.photoUrl} 
                              alt="Package photo"
                              className="max-w-xs max-h-48 rounded-lg border shadow-sm object-cover cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => window.open(item.photoUrl, '_blank')}
                              title="Click to view full size"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                        {item.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNotifyRecipient(item.id)}
                            disabled={updateMailItemMutation.isPending}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Bell className="w-3 h-3 mr-1" />
                            Notify Recipient
                          </Button>
                        )}
                        {item.status === "notified" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkDelivered(item.id)}
                            disabled={updateMailItemMutation.isPending}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark as Delivered
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this mail item?")) {
                              deleteMailItemMutation.mutate(item.id);
                            }
                          }}
                          disabled={deleteMailItemMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:border-red-300 ml-auto"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}