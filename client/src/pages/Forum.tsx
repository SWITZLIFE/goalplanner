import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Users, Award, HelpCircle, UserPlus } from "lucide-react";
import { Link } from "wouter";

type ForumCategory = {
  id: number;
  name: string;
  description: string;
  slug: string;
  icon: string;
  order: number;
};

const iconMap = {
  "user-plus": UserPlus,
  "users": Users,
  "award": Award,
  "help-circle": HelpCircle,
  "message-square": MessageSquare,
};

export function ForumPage() {
  const { toast } = useToast();
  const { data: categories, isLoading, error } = useQuery<ForumCategory[]>({
    queryKey: ["/api/forum/categories"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load forum categories",
      variant: "destructive",
    });
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Community Forum</h1>
        <p className="text-muted-foreground">
          Connect with other members, share experiences, and grow together.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => {
          const IconComponent = iconMap[category.icon as keyof typeof iconMap];
          return (
            <Link key={category.id} href={`/forum/${category.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {IconComponent && <IconComponent className="h-6 w-6 text-primary" />}
                    <CardTitle>{category.name}</CardTitle>
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Discussions
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default ForumPage;
