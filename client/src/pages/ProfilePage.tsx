
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useLocation } from "wouter";
import { LeftPanel } from "@/components/LeftPanel";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initials = user?.email
    ?.split('@')[0]
    ?.split('.')
    ?.map(part => part[0])
    ?.join('')
    ?.toUpperCase() || '';

  if (!user) {
    setLocation("/");
    return null;
  }

  const handleConnectGoogle = () => {
    window.location.href = "/api/auth/google/init";
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to change password");
      }

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <motion.div 
          className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="h-full overflow-auto scrollbar-hide p-16">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>View and manage your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        {user.profilePhotoUrl ? (
                          <AvatarImage 
                            src={user.profilePhotoUrl} 
                            alt="Profile photo"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                        >
                          Change Photo
                        </Button>
                        <input
                          id="photo-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!file.type.startsWith('image/')) {
                              toast({
                                title: "Error",
                                description: "Please select an image file",
                                variant: "destructive",
                              });
                              return;
                            }

                            const formData = new FormData();
                            formData.append('photo', file);

                            try {
                              const response = await fetch('/api/user/profile-photo', {
                                method: 'POST',
                                body: formData,
                                credentials: 'include',
                              });

                              if (!response.ok) {
                                throw new Error('Failed to upload photo');
                              }

                              const data = await response.json();
                              toast({
                                title: "Success",
                                description: "Profile photo updated successfully",
                              });

                              window.location.reload();
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to upload profile photo",
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user.email} disabled />
                    </div>
                  </div>
                  
                  {!isChangingPassword ? (
                    <Button 
                      variant="outline"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      Change Password
                    </Button>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Update Password
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="mb-6">
                    {user?.googleConnected ? (
                      <p className="text-sm text-green-600">Google Calendar Connected!</p>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Connect Google Calendar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Connect Google Calendar</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will redirect you to Google to grant calendar
                              permissions. Continue?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConnectGoogle}>
                              Connect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
