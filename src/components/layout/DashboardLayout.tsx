
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
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
import { LayoutDashboard, CalendarDays, Building, Settings, LogOut, UserCircle, CreditCard, ShieldCheck, PlusCircle, ChevronDown, Send, Loader2, Club } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 
import { getLoggedInOwnerClubs } from '@/services/clubService';
import type { Club as ClubType } from '@/lib/types';

interface DashboardLayoutProps {
  children: ReactNode;
}

const userNavItems = [
  { href: '/dashboard/user', label: 'My Bookings', icon: CalendarDays },
  // { href: '/dashboard/user/profile', label: 'Profile', icon: UserCircle }, // Example, can be added if page exists
  // { href: '/dashboard/user/payment', label: 'Payment Methods', icon: CreditCard }, // Example
];

const ownerNavItems = [
  { href: '/dashboard/owner', label: 'Club Overview', icon: LayoutDashboard },
  // { href: '/dashboard/owner/bookings', label: 'Manage Bookings', icon: CalendarDays }, // Example
  { href: '/dashboard/owner/services', label: 'Services & Pricing', icon: CreditCard },
  { href: '/dashboard/owner/availability', label: 'Availability', icon: ShieldCheck },
  { href: '/dashboard/owner/settings', label: 'Club Settings', icon: Settings },
  { href: '/dashboard/owner/promotions', label: 'Promotions', icon: Send },
];

const commonBottomNavItems = [
    // { href: '/settings', label: 'Account Settings', icon: Settings }, // Example
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutUser, currentUser, loading: authLoading } = useAuth(); 
  
  const [currentView, setCurrentView] = useState<'user' | 'owner'>('user');
  const [ownedClubs, setOwnedClubs] = useState<ClubType[]>([]);
  const [isLoadingOwnedClubs, setIsLoadingOwnedClubs] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to settle

    if (!currentUser) {
      setIsLoadingOwnedClubs(false);
      setOwnedClubs([]);
      setCurrentView('user');
      if (pathname.startsWith('/dashboard')) router.push('/login'); // Redirect if not logged in but on dashboard path
      return;
    }

    const fetchClubsAndSetView = async () => {
      setIsLoadingOwnedClubs(true);
      try {
        const clubs = await getLoggedInOwnerClubs();
        setOwnedClubs(clubs);
        if (clubs.length > 0) {
          // User owns clubs
          if (pathname.startsWith('/dashboard/owner')) {
            setCurrentView('owner');
          } else {
            // If they own clubs but are on a user path, default to user view.
            // They can switch to owner view via dropdown.
            setCurrentView('user');
          }
        } else {
          // User owns no clubs
          if (pathname.startsWith('/dashboard/owner') && pathname !== '/dashboard/owner/register-club') {
            // Attempting to access owner dashboard but owns no clubs (and not trying to register).
            // The OwnerDashboardPage will show "register club" prompt.
            setCurrentView('owner'); 
          } else {
            setCurrentView('user'); // Default to user view for all other cases
          }
        }
      } catch (error) {
        console.error("Failed to fetch owner's clubs for dashboard layout:", error);
        setOwnedClubs([]);
        setCurrentView('user'); // Fallback to user view on error
      } finally {
        setIsLoadingOwnedClubs(false);
      }
    };
    fetchClubsAndSetView();
  }, [currentUser, pathname, router, authLoading]);


  const handleViewChange = useCallback((newView: 'user' | 'owner') => {
    if (newView === 'owner') {
      if (ownedClubs.length > 0) {
        router.push('/dashboard/owner');
      } else {
        // If trying to switch to owner but has no clubs, send to register page
        router.push('/dashboard/owner/register-club');
      }
    } else {
      router.push('/dashboard/user');
    }
    // setCurrentView will be updated by the useEffect reacting to pathname change
  }, [router, ownedClubs.length]);

  const handleLogout = async () => {
    await logoutUser();
    // AuthContext's useEffect will handle navigation away from protected routes
  };

  if (authLoading || (!currentUser && pathname.startsWith('/dashboard'))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // If auth is done, no user, and on dashboard, AuthContext should have redirected.
  // This is an extra guard.
  if (!currentUser && pathname.startsWith('/dashboard')) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <Logo className="text-lg" />
            <SidebarTrigger />
          </div>
          {!isLoadingOwnedClubs && ownedClubs.length > 0 && (
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
        <ScrollArea className="h-[calc(100vh-12rem-4rem)]"> {/* Adjust height if header/footer changes */}
          <SidebarContent className="p-2">
            <SidebarMenu>
              {(currentView === 'owner' && ownedClubs.length > 0 ? ownerNavItems : userNavItems).map((item) => (
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
            </SidebarMenu>
            {!isLoadingOwnedClubs && ownedClubs.length === 0 && (
              <SidebarMenu className="mt-4 pt-2 border-t border-sidebar-border">
                <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname === '/dashboard/owner/register-club'}
                        tooltip={{ children: "Register Your First Club", side: 'right' }}
                        variant="outline"
                        className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/30"
                    >
                        <Link href="/dashboard/owner/register-club">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Register First Club</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
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
                <SidebarMenuButton onClick={handleLogout} tooltip={{ children: "Log Out", side: 'right' }}>
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
