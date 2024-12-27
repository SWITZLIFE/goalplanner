import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, ChevronDown, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface VisionBoardImage {
  id: number;
  imageUrl: string;
  position: number;
}

import { FutureMessage } from "./FutureMessage";

export function VisionBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [isVisionBoardOpen, setIsVisionBoardOpen] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: images = [], isLoading } = useQuery<VisionBoardImage[]>({
    queryKey: ["/api/vision-board"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

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
    <div className="space-y-8">
      <FutureMessage />
      <div className="h-px bg-border" />

      {/* Vision Board Section */}
      <Collapsible
        open={isVisionBoardOpen}
        onOpenChange={setIsVisionBoardOpen}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <CollapsibleTrigger className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Vision Board</h2>
            {isVisionBoardOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
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

        <CollapsibleContent
          className={cn(
            "data-[state=open]:animate-collapsible-down",
            "data-[state=closed]:animate-collapsible-up"
          )}
        >
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
        </CollapsibleContent>
      </Collapsible>

      {/* Calendar Section */}
      <Collapsible
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        className="space-y-4"
      >
        <div className="flex justify-between items-center">
          <CollapsibleTrigger className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Monthly Calendar</h2>
            {isCalendarOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <div className="text-sm text-muted-foreground">
            {date ? format(date, 'MMMM yyyy') : 'Select a date'}
          </div>
        </div>

        <CollapsibleContent
          className={cn(
            "data-[state=open]:animate-collapsible-down",
            "data-[state=closed]:animate-collapsible-up"
          )}
        >
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-primary/5 p-4">
              <h2 className="text-xl font-semibold">Task Calendar</h2>
              <div className="flex justify-between items-center mt-2">
                <button
                  className="p-1 hover:bg-gray-200 rounded"
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentMonth(newDate);
                  }}
                >
                  ←
                </button>
                <span className="font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  className="p-1 hover:bg-gray-200 rounded"
                  onClick={() => {
                    const newDate = new Date(currentMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentMonth(newDate);
                  }}
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center border-b">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <div key={day} className="p-2 font-medium border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y">
              {Array.from({ length: 35 }, (_, i) => {
                const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const startDay = startOfMonth.getDay(); // 0 = Sunday
                // Convert Sunday = 0 to Monday = 0 by shifting the days
                const mondayStartDay = startDay === 0 ? 6 : startDay - 1;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - mondayStartDay + 1);
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[100px] p-2",
                      !isCurrentMonth && "bg-gray-50 text-gray-400",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <div className="font-medium mb-2">
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {/* Task placeholders for demo */}
                      {isCurrentMonth && Math.random() > 0.7 && (
                        <div className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 bg-blue-100">
                          Sample Task
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}