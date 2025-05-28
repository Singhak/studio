
import { AppLayout } from '@/components/layout/AppLayout';
import { CompleteProfileForm } from '@/components/features/auth/CompleteProfileForm';

export default function CompleteProfilePage() {
  return (
    <AppLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
        <CompleteProfileForm />
      </div>
    </AppLayout>
  );
}
