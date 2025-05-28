"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, CalendarDays, Building, Settings, LogOut, UserCircle, CreditCard, ShieldCheck, PlusCircle } from 'lucide-react';

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
  { href: '/dashboard/owner/availability', label: 'Availability', icon: ShieldCheck }, // Using ShieldCheck as placeholder
  { href: '/dashboard/owner/settings', label: 'Club Settings', icon: Settings },
];

const commonBottomNavItems = [
    { href: '/settings', label: 'Account Settings', icon: Settings },
];

// Mock user role
const userRole: 'user' | 'owner' = 'owner'; // Change to 'user' or 'owner' to test

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const navItems = userRole === 'owner' ? ownerNavItems : userNavItems;

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <Logo className="text-lg" />
            <SidebarTrigger className="md:hidden" />
          </div>
        </SidebarHeader>
        <ScrollArea className="h-[calc(100vh-12rem)]"> {/* Adjust height based on header/footer */}
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
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
              {userRole === 'owner' && (
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
