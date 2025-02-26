
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Save, Trash2, CalendarClock, Share2, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Source = {
  id: string;
  title: string;
  url: string;
  publication_date: string;
};

type Post = {
  id: string;
  content: string;
  topic: string | null;
  hashtags: string[] | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_for: string | null;
  sources?: Source[];
};

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!user || !id) throw new Error("Missing required data");

      const { data, error } = await supabase
        .from("linkedin_posts")
        .select(`
          *,
          sources:post_sources(id, title, url, publication_date)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("is_current_version", true)
        .single();

      if (error) throw error;
      return data as Post;
    },
    enabled: !!user && !!id
  });

  // Update form state when post data changes or edit mode is enabled
  useEffect(() => {
    if (post) {
      setContent(post.content);
      setTopic(post.topic || "");
      setHashtags(post.hashtags?.join(" ") || "");
    }
  }, [post, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async (updatedPost: Partial<Post>) => {
      if (!user || !id) throw new Error("Missing required data");

      const { error } = await supabase
        .from("linkedin_posts")
        .update(updatedPost)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      toast.success("Post updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update post");
      console.error("Update error:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Missing required data");

      const { error } = await supabase
        .from("linkedin_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted successfully");
      navigate("/posts");
    },
    onError: (error) => {
      toast.error("Failed to delete post");
      console.error("Delete error:", error);
    },
  });

  const handleSave = () => {
    const parsedHashtags = hashtags
      .split(" ")
      .filter(tag => tag.length > 0)
      .map(tag => tag.startsWith("#") ? tag : `#${tag}`);

    updateMutation.mutate({
      content,
      topic: topic || null,
      hashtags: parsedHashtags,
    });
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Post copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy post");
    }
  };

  const getStatusLabel = (post: Post) => {
    if (post.published_at) return "Published";
    if (post.scheduled_for) return "Scheduled";
    return "Draft";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "text-green-600";
      case "Scheduled":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              Loading post...
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              Post not found
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Post Details</h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="secondary" onClick={handleCopyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Button variant="secondary" onClick={() => deleteMutation.mutate()}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className={`${getStatusColor(getStatusLabel(post))} font-medium`}>
                  {getStatusLabel(post)}
                </span>
                {post.scheduled_for && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-4 h-4" />
                    Scheduled for {new Date(post.scheduled_for).toLocaleDateString()}
                  </span>
                )}
                {post.published_at && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Share2 className="w-4 h-4" />
                    Published on {new Date(post.published_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter topic"
                      />
                    </div>
                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hashtags">Hashtags</Label>
                      <Input
                        id="hashtags"
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="Enter hashtags separated by spaces"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {post.topic && (
                      <div>
                        <Label className="text-muted-foreground">Topic</Label>
                        <p>{post.topic}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Content</Label>
                      <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>
                    {post.sources && post.sources.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Sources</Label>
                        <div className="space-y-2 mt-2">
                          {post.sources.map((source) => (
                            <a
                              key={source.id}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:underline"
                            >
                              <Link className="w-4 h-4" />
                              <span>{source.title}</span>
                              <span className="text-sm text-muted-foreground">
                                ({new Date(source.publication_date).toLocaleDateString()})
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Hashtags</Label>
                        <p className="text-blue-600">
                          {post.hashtags.join(" ")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
