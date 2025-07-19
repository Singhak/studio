
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
        {/* Pie chart circle using a clip path to create the quadrants */}
        <defs>
          <clipPath id="circle-clip">
            <circle cx="16" cy="16" r="16" />
          </clipPath>
        </defs>
        <g clipPath="url(#circle-clip)">
          {/* Top-left - Blue */}
          <rect x="0" y="0" width="16" height="16" fill="#3B82F6" />
          {/* Top-right - Light Green */}
          <rect x="16" y="0" width="16" height="16" fill="#A7F3D0" />
          {/* Bottom-left - Orange */}
          <rect x="0" y="16" width="16" height="16" fill="#F97316" />
          {/* Bottom-right - Dark Green */}
          <rect x="16" y="16" width="16" height="16" fill="#10B981" />
        </g>
        
        {/* Text "Playce" */}
        <text
          x="42"
          y="23"
          fontFamily="sans-serif"
          fontSize="20"
          fontWeight="bold"
          fill="hsl(var(--primary))"
          className="text-primary"
        >
          Playce
        </text>
        
        {/* Stylized 'P' overlay */}
        <text
          x="26"
          y="23"
          fontFamily="sans-serif"
          fontSize="20"
          fontWeight="bold"
          fill="#60A5FA"
        >
          P
        </text>
      </svg>
    </Link>
  );
}
