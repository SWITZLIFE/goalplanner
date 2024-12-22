import { UserMenu } from "./UserMenu";
import { Link } from "wouter";
import { Gift, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          Goal Navigator
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 mr-4">
            <Link href="/rewards">
              <Button variant="ghost" size="sm" className="gap-2">
                <Gift className="h-4 w-4" />
                Reward Store
              </Button>
            </Link>
            <Link href="/community">
              <Button variant="ghost" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Community Board
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="ghost" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </nav>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
