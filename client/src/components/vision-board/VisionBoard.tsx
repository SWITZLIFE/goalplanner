import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VisionBoardImage {
  id: number;
  imageUrl: string;
  position: number;
}

export function VisionBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: images = [], isLoading } = useQuery<VisionBoardImage[]>({
    queryKey: ["/api/vision-board"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `vision-board/${uniqueSuffix}-${file.name}`;
      formData.append("filename", filename);
      
      const response = await fetch("/api/vision-board/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const response = await fetch(`/api/vision-board/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vision-board"] });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (images.length >= 12) {
      toast({
        title: "Error",
        description: "Maximum 12 images allowed. Please delete some images first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
    }
  };

  // Create array of 12 slots
  const slots = Array.from({ length: 12 }, (_, i) => {
    return images.find(img => img.position === i) || null;
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Vision Board</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={images.length >= 12 || uploading}
          onClick={() => document.getElementById("image-upload")?.click()}
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Add Image"}
        </Button>
        <input
          id="image-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {slots.map((image, index) => (
          <div
            key={index}
            className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden group"
          >
            {image ? (
              <>
                <img
                  src={image.imageUrl}
                  alt={`Vision board image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => deleteMutation.mutate(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Empty Slot
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
