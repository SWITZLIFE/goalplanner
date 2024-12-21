import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthPage from "./pages/AuthPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { Header } from "@/components/Header";
import { useUser } from "@/hooks/use-user";

function App() {
  const { user, isLoading } = useUser();
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Special case for password reset page
  if (window.location.pathname === '/reset-password' && resetToken) {
    return <ResetPasswordPage />;
  }

  // If not authenticated (and not on reset password page), show auth page
  if (!user && !resetToken) {
    // Remove any stale data
    localStorage.clear();
    sessionStorage.clear();
    // Clear any existing DOM state
    const dashboard = document.querySelector('.dashboard-content');
    if (dashboard) {
      dashboard.remove();
    }
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/goals/:id" component={GoalView} />
          <Route path="/rewards" component={RewardPage} />
          <Route path="/analytics" component={AnalyticsPage} />
        </Switch>
      </main>
    </div>
  );
}

export default App;
