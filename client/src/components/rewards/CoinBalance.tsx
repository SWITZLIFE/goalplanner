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
    gcTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.status === 401) return false;
      return failureCount < 3;
    },
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

  // Don't show anything if there's an auth error
  if (isError) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-[#D8F275] relative">
      <Coins className="h-4 w-4" />
      <span className="font-medium">{rewards?.coins ?? 0}</span>
      <CoinAnimation 
        amount={earnedCoins}
        onComplete={() => setEarnedCoins(0)}
      />
    </div>
  );
}