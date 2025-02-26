
import React from "react";
import { Card } from "@/components/ui/card";

export default function Posts() {
  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Posts</h1>
        <Card className="p-6">
          <div className="text-center text-muted-foreground py-8">
            No posts yet. Start by generating your first post!
          </div>
        </Card>
      </div>
    </div>
  );
}
