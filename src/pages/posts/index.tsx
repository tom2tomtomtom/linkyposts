
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Edit, Trash2, CalendarClock, CheckSquare, FileEdit } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Post = {
  id: string;
  content: string;
  topic: string | null;
  created_at: string;
  published_at: string | null;
  scheduled_for: string | null;
};

type PostStatus = "all" | "draft" | "scheduled" | "published";

export default function Posts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const filterFromUrl = searchParams.get("filter") as PostStatus | null;
  const [selectedStatus, setSelectedStatus] = React.useState<PostStatus>(filterFromUrl || "all");

  React.useEffect(() => {
    if (filterFromUrl && filterFromUrl !== selectedStatus) {
      setSelectedStatus(filterFromUrl as PostStatus);
    }
  }, [filterFromUrl]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", user?.id, selectedStatus],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      let query = supabase
        .from("linkedin_posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_current_version", true)
        .order("created_at", { ascending: false });

      if (selectedStatus === "published") {
        query = query.not("published_at", "is", null);
      } else if (selectedStatus === "scheduled") {
        query = query.is("published_at", null).not("scheduled_for", "is", null);
      } else if (selectedStatus === "draft") {
        query = query.is("published_at", null).is("scheduled_for", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Post[];
    },
    enabled: !!user,
  });

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Post copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("linkedin_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      // Invalidate the posts query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["posts", user?.id, selectedStatus] });
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete post");
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Published":
        return <CheckSquare className="w-4 h-4" />;
      case "Scheduled":
        return <CalendarClock className="w-4 h-4" />;
      default:
        return <FileEdit className="w-4 h-4" />;
    }
  };

  const formatScheduledDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Posts</h1>
          <Button onClick={() => navigate("/posts/generate")}>
            Generate New Post
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedStatus === "all" ? "default" : "secondary"}
            onClick={() => setSelectedStatus("all")}
          >
            All
          </Button>
          <Button
            variant={selectedStatus === "draft" ? "default" : "secondary"}
            onClick={() => setSelectedStatus("draft")}
          >
            Drafts
          </Button>
          <Button
            variant={selectedStatus === "scheduled" ? "default" : "secondary"}
            onClick={() => setSelectedStatus("scheduled")}
          >
            Scheduled
          </Button>
          <Button
            variant={selectedStatus === "published" ? "default" : "secondary"}
            onClick={() => setSelectedStatus("published")}
          >
            Published
          </Button>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              Loading posts...
            </div>
          </Card>
        ) : !posts || posts.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              No posts yet. Start by generating your first post!
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => {
              const status = getStatusLabel(post);
              return (
                <Card key={post.id} className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="line-clamp-3 mb-2">{post.content}</p>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status}
                          </span>
                          {post.scheduled_for && (
                            <span className="text-sm flex items-center gap-1 text-blue-600">
                              <CalendarClock className="w-4 h-4" />
                              {formatScheduledDateTime(post.scheduled_for)}
                            </span>
                          )}
                          {post.topic && (
                            <span className="text-sm text-muted-foreground">
                              • {post.topic}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyToClipboard(post.content)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/posts/${post.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
