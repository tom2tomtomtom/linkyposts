
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Copy, Trash2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PostImageGenerator } from "@/components/PostImageGenerator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState("");
  const [showPublishConfirm, setShowPublishConfirm] = React.useState(false);

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

      const { data: existingToken } = await supabase
        .functions.invoke("linkedin-publish", {
          body: { 
            linkedInPostId: id,
            generateImage: post.image_url === null, // Only generate if no image exists
            imagePrompt: `Professional LinkedIn image related to: ${post.topic}. Create a visually appealing, corporate-friendly image suitable for a LinkedIn post.`
          }
        });

      if (existingToken?.postUrl) {
        toast.success("Successfully published to LinkedIn!", {
          action: {
            label: "View Post",
            onClick: () => window.open(existingToken.postUrl, "_blank"),
          },
        });
        
        queryClient.invalidateQueries({ queryKey: ["post", id] });
      }
    } catch (error: any) {
      console.error("Error publishing to LinkedIn:", error);
      toast.error(error.message || "Failed to publish to LinkedIn. Please try reconnecting your account.");
    } finally {
      setIsPublishing(false);
      setShowPublishConfirm(false);
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
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["post", id] });
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
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={isPublishing || !!post.linkedin_post_id}
                  className="flex items-center gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
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
          <div className="whitespace-pre-wrap mb-6">{post.content}</div>
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

        {!post.linkedin_post_id && (
          <PostImageGenerator
            postId={post.id}
            topic={post.topic}
            onImageGenerated={handleImageGenerated}
          />
        )}
      </Card>

      <AlertDialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to LinkedIn</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish this post to LinkedIn? Please make sure your LinkedIn account is properly connected and authorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              {isPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
