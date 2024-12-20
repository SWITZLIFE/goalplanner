import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";

interface Rewards {
  id: number;
  userId: number;
  coins: number;
  lastUpdated: string;
}

export function CoinBalance() {
  const { data: rewards, isError } = useQuery<Rewards>({
    queryKey: ["/api/rewards"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60, // Cache for 1 minute
    refetchOnMount: true,
    refetchInterval: 1000, // Poll every second while the component is mounted
  });

  return (
    <div className="flex items-center gap-2 text-yellow-500">
      <Coins className="h-4 w-4" />
      <span className="font-medium">{isError ? '?' : (rewards?.coins ?? 0)}</span>
    </div>
  );
}
