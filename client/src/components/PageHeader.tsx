
import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Gift, BarChart2 } from "lucide-react";

export function PageHeader() {
  return (
    <div className="h-14 flex pt-5 justify-between px-8 text-white border-white/10">
      <nav className="flex gap-6">
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
