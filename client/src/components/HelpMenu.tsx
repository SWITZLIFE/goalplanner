import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, BookOpen, Search, MessageSquarePlus } from "lucide-react";
import { Link } from "wouter";

export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full w-8 h-8 hover:bg-accent">
        <HelpCircle className="w-5 h-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/help/walkthrough" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Walkthrough</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help/center" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Help Center</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help/news" className="flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4" />
            <span>What's New</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
