
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BrainCircuit, Clock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Transform Your LinkedIn Presence
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Generate engaging, professional LinkedIn posts tailored to your style and industry using AI-powered content creation.
        </p>
        <Link to="/posts/generate">
          <Button size="lg" className="group">
            Start Creating
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <BrainCircuit className="w-12 h-12 text-primary" />
            <h3 className="text-xl font-semibold">AI-Powered Content</h3>
            <p className="text-muted-foreground">
              Let AI understand your writing style and create posts that sound authentically like you.
            </p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <Clock className="w-12 h-12 text-primary" />
            <h3 className="text-xl font-semibold">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Plan and schedule your posts for optimal engagement times with our intelligent posting system.
            </p>
          </Card>

          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <Share2 className="w-12 h-12 text-primary" />
            <h3 className="text-xl font-semibold">Direct Integration</h3>
            <p className="text-muted-foreground">
              Seamlessly publish your posts directly to LinkedIn with just one click.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Elevate Your LinkedIn Content?</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Join professionals who are already using our platform to create engaging, consistent LinkedIn content.
        </p>
        <Link to="/auth/signup">
          <Button variant="secondary" size="lg" className="group">
            Get Started Free
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
