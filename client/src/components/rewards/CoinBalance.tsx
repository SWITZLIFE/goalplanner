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
    refetchInterval: 5000, // Poll every 5 seconds instead of every second
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchIntervalInBackground: false, // Don't poll when tab is in background
    staleTime: 4000, // Consider data fresh for 4 seconds
    cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
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
    <div className="flex items-center gap-2 text-[#D8F275] relative">
      <Coins className="h-4 w-4" />
      <span className="font-medium">{isError ? '?' : (rewards?.coins ?? 0)}</span>
      <CoinAnimation 
        amount={earnedCoins}
        onComplete={() => setEarnedCoins(0)}
      />
    </div>
  );
}