
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = React.useState("");

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
    enabled: !!id,
    onSuccess: (data) => {
      if (data) {
        setContent(data.content || "");
        setTopic(data.topic || "");
        setHashtags(data.hashtags || []);
      }
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No post ID provided");
      
      const { error } = await supabase
        .from("linkedin_posts")
        .update({
          content,
          topic,
          hashtags,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post updated successfully");
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      navigate(`/posts/${id}`);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update post");
    }
  });

  const handleAddHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      setHashtags([...hashtags, hashtagInput.trim()]);
      setHashtagInput("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePostMutation.mutate();
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
        onClick={() => navigate(`/posts/${id}`)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to post
      </Button>
      
      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium mb-1">
                Topic
              </label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter post topic"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter post content"
                className="min-h-[200px]"
              />
            </div>

            <div>
              <label htmlFor="hashtags" className="block text-sm font-medium mb-1">
                Hashtags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="hashtags"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Add a hashtag"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHashtag();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddHashtag}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-secondary px-2 py-1 rounded-full text-sm text-muted-foreground flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updatePostMutation.isPending}
              >
                {updatePostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

