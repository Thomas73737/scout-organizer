import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

import Home from "@/pages/home";
import Announcements from "@/pages/announcements";
import Attendance from "@/pages/attendance";
import Posts from "@/pages/posts";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Waiting from "@/pages/waiting";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();

  if (isLoading || (isAuthenticated && adminOnly && profileLoading)) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && profile?.role !== "leader" && profile?.role !== "developer") {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/waiting" component={Waiting} />
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/announcements">
        <ProtectedRoute component={Announcements} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={Attendance} />
      </Route>
      <Route path="/posts">
        <ProtectedRoute component={Posts} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} adminOnly={true} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
