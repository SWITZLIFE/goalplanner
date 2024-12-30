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
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
          <HelpCircle className="h-4 w-4" />
          <span className="text-sm lg:text-base font-semibold">Tutorial</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
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