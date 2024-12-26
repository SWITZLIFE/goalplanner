import { CoinBalance } from "@/components/rewards/CoinBalance";
import { RewardStore } from "@/components/rewards/RewardStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function RewardPage() {
  return (
    <div className="p-8 bg-background h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto h-full">
        <div className="flex justify-between items-center mb-8 mt-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <CoinBalance />
        </div>
        <RewardStore />
      </div>
    </div>
  );
}
