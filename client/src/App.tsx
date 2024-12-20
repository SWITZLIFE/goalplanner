import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthPage from "./pages/AuthPage";
import { Header } from "@/components/Header";
import { useUser } from "@/hooks/use-user";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemeToggle } from "@/components/ThemeToggle";

function App() {
  const { user, isLoading } = useUser();
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');

  return (
    <ThemeProvider defaultTheme="dark">
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : window.location.pathname === '/reset-password' && resetToken ? (
        <ResetPasswordPage />
      ) : !user ? (
        <AuthPage />
      ) : (
        <div className="min-h-screen bg-background">
          <ThemeToggle />
          <Header />
          <main className="container py-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/goals/:id" component={GoalView} />
              <Route path="/rewards" component={RewardPage} />
            </Switch>
          </main>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
