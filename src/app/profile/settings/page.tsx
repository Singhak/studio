import { AppLayout } from '@/components/layout/AppLayout';
import { ProfileSettingsForm } from '@/components/features/auth/ProfileSettingsForm';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <AppLayout>
      <div className="container max-w-3xl py-8 md:py-12">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center text-3xl">
                    <Settings className="mr-3 h-8 w-8 text-primary"/>
                    Account Settings
                </CardTitle>
                <CardDescription>
                    Manage your profile information, security settings, and account preferences.
                </CardDescription>
            </CardHeader>
        </Card>

        <Suspense fallback={
            <div className="flex h-64 items-center justify-center rounded-lg border">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
          <ProfileSettingsForm />
        </Suspense>
      </div>
    </AppLayout>
  );
}
