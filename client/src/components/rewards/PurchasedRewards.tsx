import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Gift, Star, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PurchasedReward {
  id: number;
  userId: number;
  rewardItemId: number;
  purchaseDate: string;
  isActive: boolean;
  rewardItem: {
    id: number;
    name: string;
    description: string | null;
    cost: number;
    icon: string;
    type: string;
  };
}

export function PurchasedRewards() {
  const { data: purchasedRewards = [] } = useQuery<PurchasedReward[]>({
    queryKey: ["/api/rewards/purchased"],
  });

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

  if (purchasedRewards.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">You haven't purchased any rewards yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-2xl font-semibold">Your Rewards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {purchasedRewards.map((reward) => (
          <Card key={reward.id} className="hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                {getIcon(reward.rewardItem.icon)}
                {reward.rewardItem.name}
              </CardTitle>
              <CardDescription>
                Purchased {formatDistanceToNow(new Date(reward.purchaseDate), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{reward.rewardItem.description}</p>
              {!reward.isActive && (
                <p className="text-sm text-muted-foreground mt-2 italic">Used</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
