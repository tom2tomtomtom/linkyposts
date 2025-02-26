
import { Button } from "@/components/ui/button";
import { connectLinkedIn } from "@/utils/linkedinAuth";
import { LinkedinIcon } from "lucide-react";

export default function LinkedInLoginButton() {
  const handleLinkedInLogin = async () => {
    try {
      await connectLinkedIn();
    } catch (error) {
      console.error('LinkedIn login error:', error);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white"
      onClick={handleLinkedInLogin}
    >
      <LinkedinIcon className="h-5 w-5" />
      Sign in with LinkedIn
    </Button>
  );
}
