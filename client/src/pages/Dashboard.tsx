import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { LeftPanel } from "@/components/LeftPanel";
import { PageHeader } from "@/components/PageHeader";
import { useGoals } from "@/hooks/use-goals";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { isLoading } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
          <div className="h-full overflow-auto scrollbar-hide p-16">
            <div className="max-w-8xl mx-auto">
              <VisionBoard />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}