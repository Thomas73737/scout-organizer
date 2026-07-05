import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { PushNotificationProvider } from "@/hooks/PushNotificationContext";

import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Announcements from "@/pages/announcements";
import Notifications from "@/pages/notifications";
import Attendance from "@/pages/attendance";
import Posts from "@/pages/posts";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import Waiting from "@/pages/waiting";
import Chat from "@/pages/chat";
import CalendarPage from "@/pages/calendar-scout";
import Leaderboard from "@/pages/leaderboard";
import BadgesAdmin from "@/pages/badges-admin";
import PublicProfile from "@/pages/public-profile";

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

  if (adminOnly && profile?.role !== "leader" && profile?.role !== "developer" && profile?.role !== "cp_of_cps") {
    return <Redirect to="/dashboard" />;
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
      <Route path="/" component={Landing} />
      <Route path="/dashboard">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/announcements">
        <ProtectedRoute component={Announcements} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={Notifications} />
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
      <Route path="/profile/:userId">
        <ProtectedRoute component={PublicProfile} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} adminOnly={true} />
      </Route>
      <Route path="/admin/badges">
        <ProtectedRoute component={BadgesAdmin} adminOnly={true} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute component={CalendarPage} />
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute component={Leaderboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  return (
    <PushNotificationProvider userId={isAuthenticated ? user?.id || null : null}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </PushNotificationProvider>
  );
}

export default App;
