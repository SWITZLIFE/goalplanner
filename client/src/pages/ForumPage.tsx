import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, Users, Trophy, HelpCircle, Target, MessageCircle, Waves } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LeftPanel } from "@/components/LeftPanel";

interface ForumCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  icon: string;
  order: number;
}

const iconMap = {
  'wave': Waves,
  'users': Users,
  'trophy': Trophy,
  'help-circle': HelpCircle,
  'target': Target,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
};

export default function ForumPage() {
  const { data: categories, isLoading } = useQuery<ForumCategory[]>({
    queryKey: ["/api/forum/categories"],
  });

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || MessageSquare;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-8xl mx-auto">
              <h1 className="text-4xl font-bold mb-8">Community Forum</h1>
              <p className="text-muted-foreground mb-8">
                Join discussions, share your journey, and connect with other goal achievers.
              </p>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="h-40 animate-pulse">
                      <CardContent className="p-6" />
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories?.map((category) => (
                    <Link key={category.id} href={`/forum/${category.slug}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            {getIcon(category.icon)}
                            {category.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">
                            {category.description}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}