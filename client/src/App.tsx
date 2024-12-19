import { Switch, Route } from "wouter";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/goals/:id" component={GoalView} />
      </Switch>
    </div>
  );
}

export default App;
