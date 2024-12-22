import { CoinBalance } from "@/components/rewards/CoinBalance";
import { RewardStore } from "@/components/rewards/RewardStore";
import { CommunityBoard } from "@/components/community/CommunityBoard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RewardPage() {
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

        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="store">Reward Store</TabsTrigger>
            <TabsTrigger value="community">Community Board</TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <RewardStore />
          </TabsContent>

          <TabsContent value="community">
            <CommunityBoard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
