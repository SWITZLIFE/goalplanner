
import { VisionBoard } from "@/components/vision-board/VisionBoard";
import { LeftPanel } from "@/components/LeftPanel";
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
    <div className="flex h-screen">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 px-8 bg-white overflow-auto">
          <motion.div
            initial={{ x: 50, opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="max-w-8xl mx-auto ml-4"
          >
            <VisionBoard />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
