
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { connectLinkedIn, publishToLinkedIn } from "@/utils/linkedinAuth";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [isPublishing, setIsPublishing] = React.useState(false);

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
      const { data, error } = await supabase
        .from("linkedin_auth_tokens")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const handlePublish = async () => {
    if (!user?.id || !post?.content) {
      toast.error("You must be logged in and have post content to publish");
      return;
    }

    try {
      setIsPublishing(true);
      
      // If not connected to LinkedIn, initiate LinkedIn OAuth flow
      if (!linkedinToken) {
        toast.info("Please connect your LinkedIn account first");
        await connectLinkedIn();
        return;
      }

      // Check if the LinkedIn token is expired
      if (linkedinToken.expires_at && new Date(linkedinToken.expires_at) < new Date()) {
        toast.info("LinkedIn connection expired, please reconnect");
        await connectLinkedIn();
        return;
      }

      // Publish to LinkedIn
      const result = await publishToLinkedIn(post.content, user.id);
      
      // Update post with LinkedIn post ID
      if (result.postId) {
        const { error: updateError } = await supabase
          .from("linkedin_posts")
          .update({ 
            linkedin_post_id: result.postId,
            published_at: new Date().toISOString()
          })
          .eq("id", post.id);

        if (updateError) throw updateError;
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
      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{post.topic || "Untitled Post"}</h1>
            {post.hook && (
              <p className="text-blue-600 mb-4">{post.hook}</p>
            )}
          </div>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !!post.linkedin_post_id}
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            {post.linkedin_post_id ? "Published" : "Publish to LinkedIn"}
          </Button>
        </div>
        
        <div className="whitespace-pre-wrap">{post.content}</div>
        
        {post.hashtags && post.hashtags.length > 0 && (
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
