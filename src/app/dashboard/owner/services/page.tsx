
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Construction, ListChecks } from "lucide-react";

export default function ManageServicesPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Manage Services</h1>
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
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            Services & Pricing
            </CardTitle>
          <CardDescription>
            This section will allow you to add, edit, or remove services offered by your club, along with their pricing and duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-lg">
            <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-muted-foreground">
              Feature Under Development
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              The ability to manage services and pricing is coming soon!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
