
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PostImageGeneratorProps {
  postId: string;
  topic?: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export function PostImageGenerator({ postId, topic, onImageGenerated }: PostImageGeneratorProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState("");
  const queryClient = useQueryClient();

  // Query both the post image and post content
  const { data: existingData, isLoading } = useQuery({
    queryKey: ["post_data", postId],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [imageResult, postResult] = await Promise.all([
        supabase
          .from("post_images")
          .select("*, custom_prompt")
          .eq("linkedin_post_id", postId)
          .maybeSingle(),
          
        supabase
          .from("linkedin_posts")
          .select("content, image_url, custom_prompt")
          .eq("id", postId)
          .single()
      ]);

      if (postResult.error) {
        console.error("Error fetching post:", postResult.error);
        return null;
      }

      // Set the custom prompt from existing data if available
      if (imageResult.data?.custom_prompt || postResult.data?.custom_prompt) {
        setCustomPrompt(imageResult.data?.custom_prompt || postResult.data?.custom_prompt || "");
      }

      return {
        existingImage: imageResult.data,
        postContent: postResult.data?.content,
        postImageUrl: postResult.data?.image_url
      };
    },
    enabled: !!user?.id && !!postId,
    staleTime: 0,
    gcTime: 0
  });

  const generateImage = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to generate images");
      return;
    }

    if (!postId) {
      toast.error("No post ID provided");
      return;
    }

    // Get the latest post content directly from the database
    const { data: postData, error: postError } = await supabase
      .from("linkedin_posts")
      .select("content")
      .eq("id", postId)
      .single();

    if (postError || !postData?.content) {
      toast.error("No post content found to generate image from");
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: {
          postId,
          topic,
          userId: user.id,
          postContent: postData.content,
          customPrompt: customPrompt.trim()
        },
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (!data?.imageUrl) {
        throw new Error("No image URL returned from function");
      }

      // Call the callback with the new image URL
      onImageGenerated?.(data.imageUrl);

      // Invalidate and refetch both queries immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["post_data", postId] }),
        queryClient.invalidateQueries({ queryKey: ["post", postId] })
      ]);

      // Force refetch the data
      await queryClient.refetchQueries({ queryKey: ["post_data", postId] });
      await queryClient.refetchQueries({ queryKey: ["post", postId] });

      toast.success("Image generated successfully!");
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error.message}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get the image URL either from the post_images table or directly from the linkedin_posts table
  const imageUrl = existingData?.postImageUrl || existingData?.existingImage?.image_url;

  if (isLoading) {
    return (
      <Card className="p-4 mt-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mt-4 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customPrompt">Custom Prompt (Optional)</Label>
          <Input
            id="customPrompt"
            placeholder="Enter a custom prompt for image generation..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>
        
        {imageUrl ? (
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-md mb-2">
              <img
                src={`${imageUrl}?${Date.now()}`}
                alt="Generated post image"
                className="w-full h-full object-cover"
              />
            </div>
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
      </div>
    </Card>
  );
}
