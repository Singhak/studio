
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
        {/* Pie chart circle */}
        <path d="M17.3619 0.428571C7.94286 0.428571 0.428571 7.94286 0.428571 17.3619C0.428571 26.781 7.94286 34.2952 17.3619 34.2952C26.781 34.2952 34.2952 26.781 34.2952 17.3619C34.2952 7.94286 26.781 0.428571 17.3619 0.428571Z" fill="#2D3748" />
        <path d="M17.3619 0.428571V17.3619H0.428571C0.428571 7.94286 7.94286 0.428571 17.3619 0.428571Z" fill="#2A64AD" />
        <path d="M0.428571 17.3619H17.3619V34.2952C7.94286 34.2952 0.428571 26.781 0.428571 17.3619Z" fill="#F97316" />
        <path d="M17.3619 17.3619H34.2952C34.2952 26.781 26.781 34.2952 17.3619 34.2952V17.3619Z" fill="#38A169" />
        <path d="M17.3619 0.428571C26.781 0.428571 34.2952 7.94286 34.2952 17.3619H17.3619V0.428571Z" fill="#68D391" />

        {/* Text "Playce" */}
        <text
          x="40"
          y="25"
          fontFamily="Arial, sans-serif"
          fontSize="18"
          fontWeight="bold"
          fill="#1E2A53"
        >
          Playce
        </text>

        {/* Stylized 'P' overlay */}
        <text
          x="28"
          y="25"
          fontFamily="Arial, sans-serif"
          fontSize="18"
          fontWeight="bold"
          fill="#4299E1"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}
        >
          P
        </text>
      </svg>
    </Link>
  );
}
