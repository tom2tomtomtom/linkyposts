
import React from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function PostDetail() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Post Details</h1>
        <Card className="p-6">
          <div className="text-center text-muted-foreground py-8">
            Post details for ID: {id} will be displayed here.
          </div>
        </Card>
      </div>
    </div>
  );
}
