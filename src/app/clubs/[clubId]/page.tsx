
import { AppLayout } from '@/components/layout/AppLayout';
import { ClubDetailsContent } from '@/components/features/clubs/ClubDetailsContent';

/**
 * In a static export (`output: 'export'`), this function tells Next.js which dynamic
 * pages to pre-render at build time. By returning an empty array, we are explicitly
 * telling Next.js *not* to pre-render any club pages. Instead, they will all be
 * rendered on the client-side, making them behave like a true Single-Page Application (SPA) route.
 */
export async function generateStaticParams() {
  return [{ clubId: '' }];
}

// The page component is now a simple Server Component wrapper.
export default function ClubDetailsPage() {
  return (
    <AppLayout>
      <div className="container py-8 px-4 mx-auto">
        {/* All fetching and rendering logic is now handled by this client component */}
        <ClubDetailsContent />
      </div>
    </AppLayout>
  );
}
