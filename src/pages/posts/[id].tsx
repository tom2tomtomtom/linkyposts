
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Copy, Trash2, ArrowLeft, ImagePlus, PencilIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { connectLinkedIn, publishToLinkedIn } from "@/utils/linkedinAuth";
import { Input } from "@/components/ui/input";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [imagePrompt, setImagePrompt] = React.useState("");

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) throw new Error("No post ID provided");
      
      const { data, error } = await supabase
        .from("linkedin_posts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: linkedinToken } = useQuery({
    queryKey: ["linkedin_token", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("linkedin_auth_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes to check token validity
  });

  const handleCopyToClipboard = async () => {
    if (!post?.content) return;
    try {
      await navigator.clipboard.writeText(post.content);
      toast.success("Post copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy post");
    }
  };

  const handleDelete = async () => {
    if (!id || !user) return;
    
    try {
      const { error } = await supabase
        .from("linkedin_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      navigate("/posts");
      queryClient.invalidateQueries({ queryKey: ["posts", user.id] });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete post");
    }
  };

  const handleGenerateImage = async () => {
    if (!id || !user?.id || !imagePrompt.trim()) {
      toast.error("Please enter an image prompt");
      return;
    }

    try {
      setIsGeneratingImage(true);
      const { data, error } = await supabase.functions.invoke("generate-post-image", {
        body: { postId: id, prompt: imagePrompt.trim() }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const { error: updateError } = await supabase
          .from("linkedin_posts")
          .update({ image_url: data.imageUrl })
          .eq("id", id);

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ["post", id] });
        toast.success("Image generated successfully");
        setImagePrompt(""); // Clear the prompt after successful generation
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePublish = async () => {
    if (!user?.id || !post?.content) {
      toast.error("You must be logged in and have post content to publish");
      return;
    }

    try {
      setIsPublishing(true);
      
      // Check if we have a valid LinkedIn token
      if (!linkedinToken?.access_token || (linkedinToken.expires_at && new Date(linkedinToken.expires_at) <= new Date())) {
        toast.info("Reconnecting to LinkedIn...");
        await connectLinkedIn();
        return;
      }

      // Publish to LinkedIn
      const result = await publishToLinkedIn(post.content, user.id);
      
      // Update post with LinkedIn post ID
      if (result?.postId) {
        const { error: updateError } = await supabase
          .from("linkedin_posts")
          .update({ 
            linkedin_post_id: result.postId,
            published_at: new Date().toISOString()
          })
          .eq("id", post.id);

        if (updateError) throw updateError;
        
        queryClient.invalidateQueries({ queryKey: ["post", id] });
      }

      toast.success("Successfully published to LinkedIn!");
    } catch (error: any) {
      console.error("Error publishing to LinkedIn:", error);
      toast.error("Failed to publish to LinkedIn. Please try reconnecting your account.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Post not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/posts")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to posts
      </Button>
      
      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{post?.topic || "Untitled Post"}</h1>
            {post?.hook && (
              <p className="text-blue-600 mb-4">{post.hook}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleCopyToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/posts/${id}/edit`)}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Enter image prompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-64"
              />
              <Button
                variant="secondary"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-2" />
                )}
                Generate Image
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !!post?.linkedin_post_id}
            >
              {isPublishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-2" />
              )}
              {post?.linkedin_post_id ? "Published" : "Publish to LinkedIn"}
            </Button>
          </div>
        </div>
        
        {post?.image_url && (
          <div className="mb-6">
            <img src={post.image_url} alt="Post illustration" className="rounded-lg w-full max-w-2xl mx-auto" />
          </div>
        )}
        
        <div className="whitespace-pre-wrap">{post?.content}</div>
        
        {post?.hashtags && post.hashtags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.hashtags.map((tag: string) => (
              <span
                key={tag}
                className="bg-secondary px-2 py-1 rounded-full text-sm text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
