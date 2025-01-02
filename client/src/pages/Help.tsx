import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Compass, GraduationCap, Users, Settings } from "lucide-react";
import { LeftPanel } from "@/components/LeftPanel";
import { PageHeader } from "@/components/PageHeader";
import { motion } from "framer-motion";

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

const cardVariants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      duration: 0.5
    }
  }
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const Help = () => {
  return (
    <div className="flex h-screen bg-primary">
      <LeftPanel />
      <div className="flex-1 flex flex-col">
        <PageHeader />
        <div className="flex-1 m-4 bg-background rounded-[30px] overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide py-14 px-14">
            <div className="max-w-8xl mx-auto">
              <h1 className="text-2xl font-bold mb-6">Resources</h1>

              <div className="mb-8">
                <h2 className="text-lg font-medium text-muted-foreground mb-4">Onboarding and best practices</h2>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {helpResources.map((resource, index) => {
                    const Icon = resource.icon;
                    return (
                      <motion.div key={index} variants={cardVariants}>
                        <Card className="group hover:shadow-md transition-shadow duration-200">
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;