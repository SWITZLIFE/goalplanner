import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/goals/:id" component={GoalView} />
        <Route path="/rewards" component={RewardPage} />
      </Switch>
    </div>
  );
}

export default App;
