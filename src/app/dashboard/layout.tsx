
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
import { LayoutDashboard, CalendarDays, Building, Settings, LogOut, UserCircle, CreditCard, ShieldCheck, PlusCircle, ChevronDown, Send, Loader2, Club, History, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 
import { getLoggedInOwnerClubs } from '@/services/clubService';
import type { Club as ClubType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
  children: ReactNode;
}

const userNavItems = [
  { href: '/dashboard/user', label: 'My Bookings', icon: CalendarDays },
];

const ownerNavItems = [
  { href: '/dashboard/owner', label: 'Club Overview', icon: LayoutDashboard },
  { href: '/dashboard/owner/services', label: 'Services & Pricing', icon: CreditCard },
  { href: '/dashboard/owner/availability', label: 'Availability', icon: ShieldCheck },
  { href: '/dashboard/owner/booking-history', label: 'Booking History', icon: History },
  { href: '/dashboard/owner/settings', label: 'Club Settings', icon: Settings },
  { href: '/dashboard/owner/promotions', label: 'Promotions', icon: Send },
];

const adminNavItems = [
  { href: '/dashboard/admin', label: 'Admin Panel', icon: Shield },
];


const commonBottomNavItems = [
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logoutUser, currentUser, loading: authLoading } = useAuth(); 
  const { toast } = useToast();
  
  const [currentView, setCurrentView] = useState<'user' | 'owner' | 'admin'>('user');
  const [ownedClubs, setOwnedClubs] = useState<ClubType[]>([]);
  const [isLoadingOwnedClubs, setIsLoadingOwnedClubs] = useState(true);

  const userHasOwnerRole = currentUser?.roles.includes('owner') ?? false;
  const userHasAdminRole = currentUser?.roles.includes('admin') ?? false;

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setIsLoadingOwnedClubs(false);
      setOwnedClubs([]);
      setCurrentView('user');
      if (pathname.startsWith('/dashboard')) router.push('/login');
      return;
    }
    
    // Route Protection
    if (pathname.startsWith('/dashboard/admin') && !userHasAdminRole) {
      toast({ variant: 'destructive', toastTitle: 'Access Denied', toastDescription: 'You do not have permission to view this page.' });
      router.push('/dashboard/user'); // Redirect non-admins away
      return;
    }

    const fetchClubsAndSetView = async () => {
      setIsLoadingOwnedClubs(true);
      if (userHasOwnerRole) {
        try {
          const clubs = await getLoggedInOwnerClubs();
          setOwnedClubs(clubs);
        } catch (error) {
          console.error("Failed to fetch owner's clubs for dashboard layout:", error);
          setOwnedClubs([]);
        }
      } else {
        setOwnedClubs([]);
      }
      setIsLoadingOwnedClubs(false);
      
      // Determine current view based on path and roles
      if (userHasAdminRole && pathname.startsWith('/dashboard/admin')) {
        setCurrentView('admin');
      } else if (userHasOwnerRole && pathname.startsWith('/dashboard/owner')) {
        setCurrentView('owner');
      } else {
        setCurrentView('user'); 
      }
    };
    fetchClubsAndSetView();
  }, [currentUser, pathname, router, authLoading, userHasOwnerRole, userHasAdminRole, toast]);


  const handleViewChange = useCallback((newView: 'user' | 'owner' | 'admin') => {
    if (newView === 'admin' && userHasAdminRole) {
        router.push('/dashboard/admin');
    } else if (newView === 'owner' && userHasOwnerRole) {
        if (ownedClubs.length > 0) {
            router.push('/dashboard/owner');
        } else {
            router.push('/dashboard/owner/register-club');
        }
    } else { // Default to user view
        router.push('/dashboard/user');
    }
  }, [router, ownedClubs.length, userHasOwnerRole, userHasAdminRole]);

  const handleLogout = async () => {
    await logoutUser();
  };

  if (authLoading || (!currentUser && pathname.startsWith('/dashboard'))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!currentUser && pathname.startsWith('/dashboard')) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  const getDisplayNavItems = () => {
    switch(currentView) {
        case 'admin': return adminNavItems;
        case 'owner': return ownerNavItems;
        case 'user':
        default:
            return userNavItems;
    }
  };
  const displayNavItems = getDisplayNavItems();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 flex flex-col space-y-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <Logo className="text-lg" />
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden"/>
          </div>
          {(userHasOwnerRole || userHasAdminRole) && ( 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="sidebarOutline" className="w-full justify-between text-xs sm:text-sm group-data-[collapsible=icon]:hidden">
                  <span className="capitalize">Viewing as: {currentView}</span>
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
                {userHasOwnerRole && (
                  <DropdownMenuItem onClick={() => handleViewChange('owner')} disabled={currentView === 'owner'}>
                    <Building className="mr-2 h-4 w-4" />
                    <span>Owner View</span>
                  </DropdownMenuItem>
                )}
                 {userHasAdminRole && (
                  <DropdownMenuItem onClick={() => handleViewChange('admin')} disabled={currentView === 'admin'}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin View</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarHeader>
        <ScrollArea className="h-[calc(100vh-12rem-4rem)]"> 
          <SidebarContent className="p-2">
            <SidebarMenu>
              {displayNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.href === '/dashboard/owner' || item.href === '/dashboard/user' || item.href === '/dashboard/admin' ? pathname === item.href : pathname.startsWith(item.href)}
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
            {!isLoadingOwnedClubs && userHasOwnerRole && currentView === 'owner' && ownedClubs.length === 0 && (
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
            <h1 className="text-lg font-semibold capitalize">{currentView} Dashboard</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
