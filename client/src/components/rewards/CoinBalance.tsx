import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { CoinAnimation } from "./CoinAnimation";

interface Rewards {
  id: number;
  userId: number;
  coins: number;
  lastUpdated: string;
}

export function CoinBalance() {
  const [previousCoins, setPreviousCoins] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);

  const { data: rewards, isError } = useQuery<Rewards>({
    queryKey: ["/api/rewards"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60, // Cache for 1 minute
    refetchOnMount: true,
    refetchInterval: 1000, // Poll every second while the component is mounted
  });

  useEffect(() => {
    if (rewards?.coins !== undefined && previousCoins !== 0) {
      const difference = rewards.coins - previousCoins;
      if (difference > 0) {
        setEarnedCoins(difference);
      }
    }
    setPreviousCoins(rewards?.coins ?? 0);
  }, [rewards?.coins]);

  return (
    <div className="flex items-center gap-2 text-yellow-500 relative">
      <Coins className="h-4 w-4" />
      <span className="font-medium">{isError ? '?' : (rewards?.coins ?? 0)}</span>
      <CoinAnimation 
        amount={earnedCoins}
        onComplete={() => setEarnedCoins(0)}
      />
    </div>
  );
}
