import { Switch, Route, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import GoalView from "./pages/GoalView";
import RewardPage from "./pages/RewardPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import { Header } from "@/components/Header";
import { useUser } from "@/hooks/use-user";
import { AnimatePresence, motion } from "framer-motion";

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

function App() {
  const { user, isLoading } = useUser();
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  const [location] = useLocation();

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
    localStorage.clear();
    sessionStorage.clear();
    const dashboard = document.querySelector('.dashboard-content');
    if (dashboard) {
      dashboard.remove();
    }
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location}
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageVariants}
          className="container py-6 relative"
          style={{ 
            position: 'relative',
            width: '100%',
            opacity: 0 
          }}
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