
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { mutate: savePreferences, isPending: isSaving } = useMutation({
    mutationFn: async (values: {
      industry: string;
      default_tone: string;
      default_pov: string;
      writing_sample: string;
    }) => {
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, ...values });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast.success("Preferences saved successfully");
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    savePreferences({
      industry: formData.get("industry") as string,
      default_tone: formData.get("tone") as string,
      default_pov: formData.get("pov") as string,
      writing_sample: formData.get("writingSample") as string,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <Card className="p-6">
            <div className="text-center text-muted-foreground py-8">
              Loading preferences...
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="industry">Default Industry</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={preferences?.industry || ""}
                placeholder="e.g. Technology, Marketing, Finance"
              />
            </div>

            <div>
              <Label htmlFor="tone">Default Tone</Label>
              <Select
                name="tone"
                defaultValue={preferences?.default_tone || ""}
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
              <Label htmlFor="pov">Default Point of View</Label>
              <Select
                name="pov"
                defaultValue={preferences?.default_pov || ""}
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

            <div>
              <Label htmlFor="writingSample">Default Writing Sample</Label>
              <Textarea
                id="writingSample"
                name="writingSample"
                defaultValue={preferences?.writing_sample || ""}
                rows={5}
                placeholder="Paste a sample of your writing here to help the AI match your style..."
              />
              <p className="mt-2 text-sm text-muted-foreground">
                This helps our AI match your preferred writing style in generated posts.
              </p>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
