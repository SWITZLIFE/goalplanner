import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { LeftPanel } from "@/components/LeftPanel";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <motion.div 
          className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden"
          initial={{ x: 50, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-8xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
               
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
              </div>
              <AnalyticsDashboard />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}