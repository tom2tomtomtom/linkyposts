
import React from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, CheckCircle, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Query to fetch post statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["postStats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      
      const { data: posts, error } = await supabase
        .from("linkedin_posts")
        .select("id, published_at, scheduled_for")
        .eq("user_id", user.id)
        .eq("is_current_version", true);

      if (error) throw error;

      const total = posts.length;
      const published = posts.filter(post => post.published_at).length;
      const scheduled = posts.filter(post => post.scheduled_for && !post.published_at).length;
      const drafts = total - published - scheduled;

      return { total, published, scheduled, drafts };
    },
    enabled: !!user,
  });

  // Query to fetch recent posts
  const { data: recentPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["recentPosts", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      
      const { data, error } = await supabase
        .from("linkedin_posts")
        .select(`
          id,
          content,
          published_at,
          scheduled_for,
          created_at
        `)
        .eq("user_id", user.id)
        .eq("is_current_version", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getPostStatus = (post: any) => {
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

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => navigate("/posts/generate")}>
            Generate New Post
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Posts</h3>
            <p className="text-3xl font-bold">{statsLoading ? "-" : stats?.total || 0}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Published</h3>
            <p className="text-3xl font-bold">{statsLoading ? "-" : stats?.published || 0}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Scheduled</h3>
            <p className="text-3xl font-bold">{statsLoading ? "-" : stats?.scheduled || 0}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
            {postsLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading...
              </div>
            ) : recentPosts?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No posts yet. Start by generating your first post!
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts?.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/posts/${post.id}`)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="line-clamp-2">{post.content}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className={getStatusColor(getPostStatus(post))}>
                            {getPostStatus(post)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => navigate("/posts/generate")}
              >
                <FileEdit className="mr-2" />
                Generate New Post
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => navigate("/posts")}
              >
                <CheckCircle className="mr-2" />
                View All Posts
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => navigate("/settings")}
              >
                <CalendarClock className="mr-2" />
                Schedule Posts
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
