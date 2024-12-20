import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";

export function CoinBalance() {
  const { data: rewards } = useQuery({
    queryKey: ["/api/rewards"],
    staleTime: 0, // Always fetch fresh data
    cacheTime: 1000 * 60, // Cache for 1 minute
  });

  return (
    <div className="flex items-center gap-2 text-yellow-500">
      <Coins className="h-4 w-4" />
      <span className="font-medium">{rewards?.coins || 0}</span>
    </div>
  );
}
