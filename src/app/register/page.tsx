import { AppLayout } from '@/components/layout/AppLayout';
import { RegisterForm } from '@/components/features/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AppLayout>
      <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-4">
        <RegisterForm />
      </div>
    </AppLayout>
  );
}
