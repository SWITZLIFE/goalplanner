import { CommunityBoard } from "@/components/community/CommunityBoard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { CoinBalance } from "@/components/rewards/CoinBalance";

export default function CommunityPage() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <CoinBalance />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-6">Community Board</h2>
          <CommunityBoard />
        </div>
      </div>
    </div>
  );
}
