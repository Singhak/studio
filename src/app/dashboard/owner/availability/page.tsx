
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Construction } from "lucide-react";

export default function ManageAvailabilityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Availability</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarClock className="mr-2 h-5 w-5 text-primary" />
            Club Availability
            </CardTitle>
          <CardDescription>
            This section will allow you to set your club's opening hours, manage court availability, and block out specific dates or times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-lg">
            <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-muted-foreground">
              Feature Under Development
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The ability to manage club availability is coming soon!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
