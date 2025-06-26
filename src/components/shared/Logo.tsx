import Link from 'next/link';
import { Swords } from 'lucide-react'; // Using Swords as a placeholder sports-related icon
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-primary", className)}>
      <Swords className="h-7 w-7" />
      <span className="text-2xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">Courtly</span>
    </Link>
  );
}
