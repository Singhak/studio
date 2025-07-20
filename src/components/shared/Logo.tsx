
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/playce-logo.png"
        alt="Playce Logo"
        width={220}
        height={64}
        className="h-8 w-auto"
      />
    </Link>
  );
}
