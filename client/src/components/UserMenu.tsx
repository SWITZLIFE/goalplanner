import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      <DropdownMenuTrigger className="hover:opacity-80">
        <Avatar onClick={() => window.location.href = '/profile'} className="cursor-pointer">
          {user.profilePhotoUrl ? (
            <AvatarImage 
              src={user.profilePhotoUrl} 
              alt="Profile photo"
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => window.location.href = "/profile"} className="cursor-pointer">
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
