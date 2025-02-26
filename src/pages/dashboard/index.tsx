
import React from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Posts</h3>
            <p className="text-3xl font-bold">0</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Published</h3>
            <p className="text-3xl font-bold">0</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Scheduled</h3>
            <p className="text-3xl font-bold">0</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
            <div className="text-center text-muted-foreground py-8">
              No posts yet. Start by generating your first post!
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-4">
              {/* Quick actions will be added here */}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
