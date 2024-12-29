
import { CoinBalance } from "@/components/rewards/CoinBalance";
import { RewardStore } from "@/components/rewards/RewardStore";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { LeftPanel } from "@/components/LeftPanel";
import { motion } from "framer-motion";

export default function RewardPage() {
  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <motion.div 
              className="max-w-8xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <RewardStore />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
