import { AppLayout } from '@/components/layout/AppLayout';
import { LoginForm } from '@/components/features/auth/LoginForm';

export default function LoginPage() {
  return (
    <AppLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
        <LoginForm />
      </div>
    </AppLayout>
  );
}
