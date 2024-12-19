import { Switch, Route } from "wouter";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";

function App() {
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
