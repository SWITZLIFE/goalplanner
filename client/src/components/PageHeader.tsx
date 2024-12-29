
import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Gift, BarChart2 } from "lucide-react";

export function PageHeader() {
  return (
    <div className="h-11 flex pt-3 justify-between px-8 text-white border-white/10">
      <nav className="flex gap-6">
        <Link href="/">
          <Button variant="ghost" className="text-sm font-medium hover:text/80">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </Link>
        <Link href="/rewards">
          <Button variant="ghost" className="text-sm font-medium hover:text/80">
            <Gift className="mr-2 h-4 w-4" />
            Reward Store
          </Button>
        </Link>
        <Link href="/analytics">
          <Button variant="ghost" className="text-sm font-medium hover:text/80">
            <BarChart2 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
        </Link>
      </nav>
      <h1 className="text-2xl font-bold">Goal Planner</h1>
    </div>
  );
}
