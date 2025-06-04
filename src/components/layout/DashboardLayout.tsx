
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, CalendarDays, Building, Settings, LogOut, UserCircle, CreditCard, ShieldCheck, PlusCircle, Repeat, ChevronDown, Send } from 'lucide-react'; // Added Send icon

interface DashboardLayoutProps {
  children: ReactNode;
}

const userNavItems = [
  { href: '/dashboard/user', label: 'My Bookings', icon: CalendarDays },
  { href: '/dashboard/user/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/user/payment', label: 'Payment Methods', icon: CreditCard },
];

const ownerNavItems = [
  { href: '/dashboard/owner', label: 'Club Overview', icon: LayoutDashboard },
  { href: '/dashboard/owner/bookings', label: 'Manage Bookings', icon: CalendarDays },
  { href: '/dashboard/owner/services', label: 'Services & Pricing', icon: CreditCard },
  { href: '/dashboard/owner/availability', label: 'Availability', icon: ShieldCheck },
  { href: '/dashboard/owner/settings', label: 'Club Settings', icon: Settings },
  { href: '/dashboard/owner/promotions', label: 'Promotions', icon: Send }, // Added Promotions link
];

const commonBottomNavItems = [
    { href: '/settings', label: 'Account Settings', icon: Settings },
];

// Mock user role
const userRole: 'user' | 'owner' = 'owner'; // Change to 'user' or 'owner' to test

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'user' | 'owner'>(userRole);

  useEffect(() => {
    // Initialize currentView based on userRole when the component mounts or userRole changes.
    setCurrentView(userRole);
  }, [userRole]);

  useEffect(() => {
    // Synchronize currentView with the pathname
    if (pathname.startsWith('/dashboard/user')) {
      setCurrentView('user');
    } else if (pathname.startsWith('/dashboard/owner')) {
      if (userRole === 'owner') {
        setCurrentView('owner');
      } else {
        // If a non-owner somehow lands on an owner path, default their sidebar view to 'user'.
        // The page content itself is handled by Next.js routing.
        setCurrentView('user');
      }
    }
    // If the path is not a dashboard path, currentView remains as set by userRole or dropdown.
  }, [pathname, userRole]);

  const handleViewChange = (newView: 'user' | 'owner') => {
    setCurrentView(newView);
    if (newView === 'owner') {
      router.push('/dashboard/owner');
    } else {
      router.push('/dashboard/user');
    }
  };

  const navItems = currentView === 'owner' ? ownerNavItems : userNavItems;
  const isOwnerRole = userRole === 'owner';


  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <Logo className="text-lg" />
            <SidebarTrigger className="md:hidden" />
          </div>
          {isOwnerRole && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="sidebarOutline" className="w-full justify-between text-xs sm:text-sm">
                  <span>Viewing as: {currentView === 'owner' ? 'Owner' : 'User'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--sidebar-width-icon)] sm:w-[calc(var(--sidebar-width)-2rem)] md:w-[calc(var(--sidebar-width)-2rem)] group-data-[collapsible=icon]:w-auto">
                <DropdownMenuLabel>Switch View</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleViewChange('user')} disabled={currentView === 'user'}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>User View</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewChange('owner')} disabled={currentView === 'owner'}>
                  <Building className="mr-2 h-4 w-4" />
                  <span>Owner View</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarHeader>
        <ScrollArea className="h-[calc(100vh-12rem-4rem)]"> {/* Adjusted height for switcher */}
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard/owner' && item.href !== '/dashboard/user') || (pathname.startsWith(item.href) && pathname.split('/').length === item.href.split('/').length +1 && (item.href === '/dashboard/owner' || item.href === '/dashboard/user') )}
                    tooltip={{ children: item.label, side: 'right' }}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isOwnerRole && currentView === 'owner' && (
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard/owner/register-club'}
                        tooltip={{ children: "Register New Club", side: 'right' }}
                        variant="outline"
                        className="mt-4 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/30"
                    >
                        <Link href="/dashboard/owner/register-club">
                        <PlusCircle className="h-4 w-4" />
                        <span>Register New Club</span>
                        </Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
        </ScrollArea>
        <SidebarFooter className="p-2 border-t">
           <SidebarMenu>
             {commonBottomNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label, side: 'right' }}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            <SidebarMenuItem>
                <SidebarMenuButton>
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
            <SidebarTrigger/>
            <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
