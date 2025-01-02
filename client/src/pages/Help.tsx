import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Compass, GraduationCap, Users, Settings } from "lucide-react";

const helpResources = [
  {
    title: "Get started with Vision Board",
    description: "New to Vision Board? Learn how to get started to optimize your goal tracking and process.",
    icon: Compass,
    action: "Get started",
    link: "/help/getting-started"
  },
  {
    title: "Onboard your team",
    description: "Effectively onboard your team in a way that lasts, so you can drive work forward together.",
    icon: Users,
    action: "Learn onboarding tips",
    link: "/help/team-onboarding"
  },
  {
    title: "Master Vision Board",
    description: "Learn strategies and tips from Vision Board Academy to improve your goal-setting process even further.",
    icon: GraduationCap,
    action: "Register for Academy",
    link: "/help/academy"
  },
  {
    title: "Stay connected with Vision Board",
    description: "Help your team stay on top of their goals anywhere with Vision Board Desktop and Mobile apps.",
    icon: Settings,
    action: "Learn more",
    link: "/help/apps"
  }
];

const Help = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Resources</h1>

      <div className="mb-8">
        <h2 className="text-lg font-medium text-muted-foreground mb-4">Onboarding and best practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {helpResources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Card key={index} className="group hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={resource.link}
                    className="text-primary hover:underline font-medium inline-flex items-center gap-2"
                  >
                    {resource.action}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Help;