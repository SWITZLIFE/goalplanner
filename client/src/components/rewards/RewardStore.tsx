import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Gift, Star, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RewardItem {
  id: number;
  name: string;
  description: string | null;
  cost: number;
  icon: string;
  type: 'digital' | 'perk' | 'discount';
  createdAt: string;
}

interface UserRewards {
  id: number;
  userId: number;
  coins: number;
  lastUpdated: string;
}

export function RewardStore() {
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const { toast } = useToast();
  
  const { data: rewardItems = [] } = useQuery<RewardItem[]>({
    queryKey: ["/api/rewards/items"],
  });

  const { data: purchasedItems = [] } = useQuery({
    queryKey: ["/api/rewards/purchased"],
  });

  const { data: userRewards } = useQuery<UserRewards>({
    queryKey: ["/api/rewards"],
    staleTime: 0,
    gcTime: 1000 * 60,
    refetchOnMount: true,
  });

  const queryClient = useQueryClient();
  
  const handlePurchase = async () => {
    if (!selectedReward) {
      console.log("No reward selected");
      return;
    }

    console.log("Processing purchase for reward:", selectedReward);
    try {
      const response = await fetch(`/api/rewards/purchase/${selectedReward.id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log("Purchase response status:", response.status);
      const data = await response.json();
      console.log("Purchase response data:", data);

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to process purchase");
      }

      toast({
        title: "Purchase successful!",
        description: `You've unlocked ${selectedReward.name}. New balance: ${data.newBalance} coins`,
      });
      
      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/rewards/items"] })
      ]);
      
      // Close the dialog
      setSelectedReward(null);
    } catch (error) {
      console.error("Purchase error details:", error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong with the purchase";
      
      toast({
        title: "Purchase failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Ensure dialog closes even if there's an error
      setSelectedReward(null);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'award':
        return <Award className="h-6 w-6" />;
      case 'gift':
        return <Gift className="h-6 w-6" />;
      case 'star':
        return <Star className="h-6 w-6" />;
      case 'crown':
        return <Award className="h-6 w-6 text-yellow-500" />;
      case 'diamond':
        return <Star className="h-6 w-6 text-blue-500" />;
      case 'paintbrush':
        return <Tag className="h-6 w-6 text-purple-500" />;
      default:
        return <Tag className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Reward Store</h2>
        <div className="text-sm text-muted-foreground">
          Your balance: <span className="font-medium text-yellow-500">{userRewards?.coins || 0} coins</span>
        </div>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Rewards</TabsTrigger>
          <TabsTrigger value="purchased">Purchased Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewardItems.map((reward) => (
          <Card key={reward.id} className="transition-shadow hover:shadow-md flex flex-col h-[220px]">
            <CardHeader className="flex-1 pb-2">
              <CardTitle className="flex items-center gap-2 text-base line-clamp-2 min-h-[48px]">
                {getIcon(reward.icon)}
                {reward.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-2">{reward.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto border-t pt-4 px-6">
              <div className="flex justify-between items-center w-full">
                <div className="text-yellow-500 font-medium">{reward.cost} coins</div>
                <Dialog open={selectedReward?.id === reward.id} onOpenChange={(open) => !open && setSelectedReward(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary"
                      disabled={!userRewards || userRewards.coins < reward.cost}
                      onClick={() => setSelectedReward(reward)}
                    >
                      Purchase
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Purchase</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to purchase {reward.name} for {reward.cost} coins?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSelectedReward(null)}>
                        Cancel
                      </Button>
                      <Button onClick={handlePurchase}>
                        Confirm Purchase
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
        </TabsContent>

        <TabsContent value="purchased" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchasedItems.map((purchase) => (
              <Card key={purchase.id} className="flex flex-col h-[220px]">
                <CardHeader className="flex-1 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getIcon(purchase.rewardItem.icon)}
                    {purchase.rewardItem.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">
                    {purchase.rewardItem.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto border-t pt-4 px-6">
                  <div className="text-sm text-muted-foreground">
                    Purchased on {new Date(purchase.purchasedAt).toLocaleDateString()}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}