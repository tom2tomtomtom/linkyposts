
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

interface PostImageGeneratorProps {
  postId: string;
  topic?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export function PostImageGenerator({ postId, topic, onImageGenerated }: PostImageGeneratorProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [imagePrompt, setImagePrompt] = React.useState('');
  const queryClient = useQueryClient();

  // Query both the post image and post content
  const { data: existingData } = useQuery({
    queryKey: ["post_data", postId],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [imageResult, postResult] = await Promise.all([
        supabase
          .from("post_images")
          .select("*")
          .eq("linkedin_post_id", postId)
          .maybeSingle(),
          
        supabase
          .from("linkedin_posts")
          .select("content, image_url")
          .eq("id", postId)
          .single()
      ]);

      console.log("Query results:", { imageResult, postResult });

      if (imageResult.error) throw imageResult.error;
      if (postResult.error) throw postResult.error;

      return {
        existingImage: imageResult.data,
        postContent: postResult.data?.content,
        postImageUrl: postResult.data?.image_url
      };
    },
    enabled: !!user?.id && !!postId,
  });

  const generateImage = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to generate images");
      return;
    }

    if (!imagePrompt.trim()) {
      toast.error("Please provide an image prompt");
      return;
    }

    try {
      setIsGenerating(true);
      console.log("Calling generate-post-image function with:", { 
        postId, 
        topic, 
        userId: user.id,
        prompt: imagePrompt
      });
      
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          postId,
          topic,
          userId: user.id,
          postContent: existingData?.postContent,
          customPrompt: imagePrompt
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

      // Call the callback with the new image URL
      onImageGenerated?.(data.imageUrl);

      // Invalidate the query to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["post_data", postId] });

      toast.success("Image generated successfully!");
      setImagePrompt(''); // Clear the prompt after successful generation
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error.message}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get the image URL either from the post_images table or directly from the linkedin_posts table
  const imageUrl = existingData?.postImageUrl || existingData?.existingImage?.image_url;

  return (
    <Card className="p-4 mt-4">
      <div className="space-y-4">
        <Textarea
          placeholder="Enter a prompt for image generation..."
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          className="min-h-[100px]"
        />

        {imageUrl && (
          <div className="space-y-4">
            <img
              src={imageUrl}
              alt="Generated post image"
              className="w-full rounded-md"
            />
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={generateImage}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center">
              <Image className="w-4 h-4 mr-2" />
              {imageUrl ? 'Regenerate Image' : 'Generate Image'}
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
