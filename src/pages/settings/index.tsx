
import React from "react";
import { Card } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        <Card className="p-6">
          <div className="text-center text-muted-foreground py-8">
            User preferences form will be implemented here.
          </div>
        </Card>
      </div>
    </div>
  );
}
