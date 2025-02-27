
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Copy, Trash2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { connectLinkedIn, publishToLinkedIn } from "@/utils/linkedinAuth";
import { PostImageGenerator } from "@/components/PostImageGenerator";
import { Textarea } from "@/components/ui/textarea";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState("");

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

  React.useEffect(() => {
    if (post?.content) {
      setEditedContent(post.content);
    }
  }, [post?.content]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(post?.content || "");
  };

  const handleSaveEdit = async () => {
    if (!id || !user?.id || !editedContent) return;

    try {
      const { error } = await supabase
        .from("linkedin_posts")
        .update({ content: editedContent })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Post updated successfully");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["post", id] });
    } catch (error: any) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
    }
  };

  const handlePublish = async () => {
    if (!user?.id || !post?.content) {
      toast.error("You must be logged in and have post content to publish");
      return;
    }

    try {
      setIsPublishing(true);
      
      if (!linkedinToken) {
        toast.info("Please connect your LinkedIn account first");
        await connectLinkedIn();
        return;
      }

      if (linkedinToken.expires_at && new Date(linkedinToken.expires_at) < new Date()) {
        toast.info("LinkedIn connection expired, please reconnect");
        await connectLinkedIn();
        return;
      }

      const result = await publishToLinkedIn(post.content, user.id);
      
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
    if (!id || !user?.id) return;
    
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from("linkedin_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Post deleted successfully");
      navigate("/posts");
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageGenerated = async (imageUrl: string) => {
    if (!id) return;
    
    const { error } = await supabase
      .from("linkedin_posts")
      .update({ image_url: imageUrl })
      .eq("id", id);

    if (error) {
      console.error("Error updating post with image URL:", error);
      toast.error("Failed to save image URL to post");
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
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStartEdit}
                  className="flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </Button>
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
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[200px] mb-4"
          />
        ) : (
          <div className="whitespace-pre-wrap">{post.content}</div>
        )}
        
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

        <PostImageGenerator
          postId={post.id}
          topic={post.topic}
          onImageGenerated={handleImageGenerated}
        />
      </Card>
    </div>
  );
}
