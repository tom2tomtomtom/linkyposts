
import LinkedInLoginButton from "@/components/auth/LinkedInLoginButton";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[#0A66C2]">Linkies</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account to start generating AI-powered LinkedIn posts
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <LinkedInLoginButton />
          <p className="text-center text-sm text-muted-foreground">
            Connect with LinkedIn to create your account
          </p>
        </div>
      </div>
    </div>
  );
}

