
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface PostImageGeneratorProps {
  postId: string;
  topic?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export function PostImageGenerator({ postId, topic, onImageGenerated }: PostImageGeneratorProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const { data: existingImage } = useQuery({
    queryKey: ["post_image", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_images")
        .select("*")
        .eq("linkedin_post_id", postId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const generateImage = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to generate images");
      return;
    }

    try {
      setIsGenerating(true);
      console.log("Calling generate-post-image function with:", { postId, topic });
      
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          postId,
          topic
        },
      });

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (!data?.imageUrl) {
        throw new Error("No image URL returned from function");
      }

      onImageGenerated?.(data.imageUrl);
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error("Error generating image:", error);
      
      // More descriptive error message
      const errorMessage = error.message || "Unknown error occurred";
      toast.error(`Failed to generate image: ${errorMessage}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-4 mt-4">
      {existingImage?.image_url ? (
        <div>
          <img
            src={existingImage.image_url}
            alt="Generated post image"
            className="w-full rounded-md mb-2"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={generateImage}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                Regenerating...
              </span>
            ) : (
              <span className="flex items-center">
                <Image className="w-4 h-4 mr-2" />
                Regenerate Image
              </span>
            )}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={generateImage}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center">
              <Image className="w-4 h-4 mr-2" />
              Generate Image
            </span>
          )}
        </Button>
      )}
    </Card>
  );
}
