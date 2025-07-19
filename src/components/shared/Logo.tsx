
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <svg
        width="110"
        height="32"
        viewBox="0 0 110 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-auto"
      >
        <g>
          <path d="M26.47,3.15C16.8,3.15,9,10.95,9,20.62c0,9.67,7.8,17.47,17.47,17.47h12.53V30.52H26.47V24.5h12.53v-7.8H26.47V3.15z" fill="none"/>
          <path d="M23.1,3.15h12.53v13.55c0,4.3-3.48,7.8-7.8,7.8h-4.73V3.15z" fill="#0072FF"/>
          <path d="M26.47,30.52h12.53v-6.02H26.47z" fill="#34E89E"/>
          <path d="M23.1,16.7v13.82h3.37c9.67,0,17.47-7.8,17.47-17.47V16.7H23.1z" fill="#0A8742"/>
          <path d="M30,13c5,2,8,7,6,12s-7,8-12,6s-8-7-6-12S25,11,30,13z" fill="#FF4E50"/>
          <text x="48" y="24" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" fontSize="18" fontWeight="bold" fill="hsl(var(--primary))">
            Playce
          </text>
        </g>
      </svg>
    </Link>
  );
}
