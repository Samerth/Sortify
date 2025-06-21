import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, Eye } from "lucide-react";
import { optimizeImage, isValidImageFile, formatFileSize, getBase64Size } from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";

interface PhotoCaptureProps {
  onPhotoCapture: (base64Data: string) => void;
  currentPhoto?: string;
  disabled?: boolean;
}

export function PhotoCapture({ onPhotoCapture, currentPhoto, disabled }: PhotoCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentPhoto || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!isValidImageFile(file)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, WebP, or GIF)",
        variant: "destructive",
      });
      return;
    }

    const originalSize = file.size;
    setIsProcessing(true);

    try {
      // Optimize the image
      const optimizedBase64 = await optimizeImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'jpeg'
      });

      const optimizedSize = getBase64Size(optimizedBase64);
      
      // Show compression results
      toast({
        title: "Photo optimized",
        description: `Original: ${formatFileSize(originalSize)} → Optimized: ${formatFileSize(optimizedSize)}`,
      });

      setPreviewUrl(optimizedBase64);
      onPhotoCapture(optimizedBase64);
    } catch (error) {
      console.error("Image optimization failed:", error);
      toast({
        title: "Photo processing failed",
        description: "Could not process the image. Please try a different photo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearPhoto = () => {
    setPreviewUrl("");
    onPhotoCapture("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Package Photo</Label>
      
      {previewUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Package photo"
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                  disabled={disabled}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={clearPhoto}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Photo optimized and ready for storage
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Add package photo</p>
                <p className="text-xs text-muted-foreground">
                  Photos are automatically optimized for storage
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileSelect}
                disabled={disabled || isProcessing}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Upload Photo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <p className="text-xs text-muted-foreground">
        Supports JPEG, PNG, WebP, and GIF. Photos are automatically resized and compressed.
      </p>
    </div>
  );
}