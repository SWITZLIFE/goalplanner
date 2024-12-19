import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export function UserMenu() {
  const { user, logout } = useUser();
  const { toast } = useToast();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
        return;
      }

      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  // Get initials from email
  const initials = user.email
    .split('@')[0]
    .split('.')
    .map(part => part[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden md:inline-block">
          {user.email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
