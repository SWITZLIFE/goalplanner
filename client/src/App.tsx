
import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { useUser } from "@/hooks/use-user";
import { AnimatePresence, motion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 1,
  },
  enter: {
    opacity: 1,
  },
  exit: {
    opacity: 1,
  },
};

function App() {
  const { user, isLoading } = useUser();
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token");
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (window.location.pathname === "/reset-password" && resetToken) {
    return <ResetPasswordPage />;
  }

  if (!user && !resetToken) {
    localStorage.clear();
    sessionStorage.clear();
    const dashboard = document.querySelector(".dashboard-content");
    if (dashboard) {
      dashboard.remove();
    }
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location}
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageVariants}
          className="flex-1 relative"
        >
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/goals/:id" component={GoalView} />
            <Route path="/rewards" component={RewardPage} />
            <Route path="/analytics" component={AnalyticsPage} />
            <Route path="/profile" component={ProfilePage} />
          </Switch>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default App;
