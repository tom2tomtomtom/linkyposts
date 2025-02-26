
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface FormData {
  topic: string;
  tone: string;
  pov: string;
  writingSample: string;
  industry: string;
  numPosts: number;
  includeNews: boolean;
}

const initialFormData: FormData = {
  topic: "",
  tone: "",
  pov: "",
  writingSample: "",
  industry: "",
  numPosts: 3,
  includeNews: true,
};

export default function GeneratePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (preferences) {
      setFormData((prev) => ({
        ...prev,
        tone: preferences.default_tone || "",
        pov: preferences.default_pov || "",
        writingSample: preferences.writing_sample || "",
        industry: preferences.industry || "",
      }));
    }
  }, [preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to generate posts");
      return;
    }

    if (!formData.topic) {
      toast.error("Topic is required");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          userId: user.id,
          topic: formData.topic,
          tone: formData.tone,
          pov: formData.pov,
          writingSample: formData.writingSample,
          industry: formData.industry,
          numPosts: formData.numPosts,
          includeNews: formData.includeNews,
        },
      });

      if (error) throw error;

      toast.success("Posts generated successfully!");
      navigate("/posts");
    } catch (error: any) {
      console.error("Error generating posts:", error);
      toast.error(error.message || "Failed to generate posts");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Generate Post</h1>
          <Card className="p-6">
            <div className="space-y-6 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Generate Post</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="topic">
                Topic <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Artificial Intelligence in Marketing, Remote Work Trends"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g. Technology, Marketing, Finance"
                />
              </div>

              <div>
                <Label htmlFor="numPosts">Number of Posts</Label>
                <Select
                  value={String(formData.numPosts)}
                  onValueChange={(value) => setFormData({ ...formData, numPosts: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select number of posts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 post</SelectItem>
                    <SelectItem value="3">3 posts</SelectItem>
                    <SelectItem value="5">5 posts</SelectItem>
                    <SelectItem value="10">10 posts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => setFormData({ ...formData, tone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="informative">Informative</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="thought-provoking">Thought-provoking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pov">Point of View</Label>
                <Select
                  value={formData.pov}
                  onValueChange={(value) => setFormData({ ...formData, pov: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a point of view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first person">First Person (I/We)</SelectItem>
                    <SelectItem value="second person">Second Person (You)</SelectItem>
                    <SelectItem value="third person">Third Person (He/She/They)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="writingSample">Writing Sample (for AI to match your style)</Label>
              <Textarea
                id="writingSample"
                value={formData.writingSample}
                onChange={(e) => setFormData({ ...formData, writingSample: e.target.value })}
                rows={5}
                placeholder="Paste a sample of your writing here to help the AI match your style..."
              />
              <p className="mt-2 text-sm text-muted-foreground">
                This helps our AI match your preferred writing style in generated posts.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeNews"
                checked={formData.includeNews}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeNews: checked as boolean })
                }
              />
              <Label htmlFor="includeNews">Include recent news and trends</Label>
            </div>

            <Button type="submit" disabled={isGenerating || !formData.topic} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Posts...
                </>
              ) : (
                "Generate LinkedIn Posts"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
