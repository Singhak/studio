import Link from 'next/link';
import { Swords } from 'lucide-react'; // Using Swords as a placeholder sports-related icon

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-primary ${className}`}>
      <Swords className="h-7 w-7" />
      <span className="text-2xl font-bold tracking-tight">Courtly</span>
    </Link>
  );
}
