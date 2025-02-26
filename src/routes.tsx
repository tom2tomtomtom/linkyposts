
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import Callback from "@/pages/auth/Callback";
import DashboardLayout from "@/layouts/DashboardLayout";
import Dashboard from "@/pages/dashboard";
import Posts from "@/pages/posts";
import GeneratePost from "@/pages/posts/generate";
import PostDetail from "@/pages/posts/[id]";
import EditPost from "@/pages/posts/edit/[id]";
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
    console.log("No authenticated user found, redirecting to login");
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
    console.log("User already authenticated, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        path: "/",
        element: <Index />
      },
      {
        path: "auth/callback",
        element: <Callback />
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
            element: <DashboardLayout />,
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
                path: "posts/:id/edit",
                element: <EditPost />
              },
              {
                path: "settings",
                element: <Settings />
              }
            ]
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
