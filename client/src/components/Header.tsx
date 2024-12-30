import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { Gift, BarChart2 } from "lucide-react";
import { Link } from "wouter";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground fixed w-full z-50">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold">
          Goal Navigator
        </div>

        <div className="flex items-center gap-4">
          <Link href="/analytics">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white/80"
              data-tutorial="analytics-button"
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>

          <Link href="/rewards">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white/80"
              data-tutorial="rewards-button"
            >
              <Gift className="h-4 w-4 mr-2" />
              Rewards
            </Button>
          </Link>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}