
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import Dashboard from "@/pages/dashboard";
import Posts from "@/pages/posts";
import GeneratePost from "@/pages/posts/generate";
import PostDetail from "@/pages/posts/[id]";
import Settings from "@/pages/settings";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <Outlet />;
}

function PublicRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
}

function AppLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Index />
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: "auth/login",
            element: <LoginPage />
          },
          {
            path: "auth/signup",
            element: <SignupPage />
          }
        ]
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />
          },
          {
            path: "posts",
            element: <Posts />
          },
          {
            path: "posts/generate",
            element: <GeneratePost />
          },
          {
            path: "posts/:id",
            element: <PostDetail />
          },
          {
            path: "settings",
            element: <Settings />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFound />
  }
]);
