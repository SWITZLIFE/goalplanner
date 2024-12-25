import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AnalyticsPage() {
  return (
    <div className="container py-8 max-w-6xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        </div>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
