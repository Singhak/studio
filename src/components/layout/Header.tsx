
"use client";

import Link from 'next/link';
import { Bell, UserCircle, LogIn, UserPlus, Menu, LogOut as LogOutIcon, Settings, LayoutDashboard, PlusCircle, CheckCheck, Trash2, Mailbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggleButton } from '@/components/shared/ThemeToggleButton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';
import type { AppNotification } from '@/lib/types';
import { useRouter } from 'next/navigation'; // Import useRouter

const baseNavLinks = [
  { href: '/clubs', label: 'Find Clubs' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter(); // Initialize useRouter
  const { 
    currentUser, 
    logoutUser, 
    loading,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
  } = useAuth();

  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    await logoutUser();
    setMobileMenuOpen(false);
  };
  
  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "?";

  let allNavLinks = [...baseNavLinks];
  if (isAuthenticated) {
    // My Bookings link is typically part of dashboard, handled by user dropdown
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Logo />
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted"></div>
            <div className="h-6 w-20 animate-pulse rounded-md bg-muted"></div>
          </div>
        </div>
      </header>
    );
  }

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    if (notification.href) {
      router.push(notification.href); 
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Logo />
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {allNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <ThemeToggleButton />
          
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 min-w-min p-0.5 text-xs flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96">
                <DropdownMenuLabel className="flex justify-between items-center">
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                     <Button variant="ghost" size="sm" className="text-xs h-auto px-2 py-1" onClick={markAllNotificationsAsRead} disabled={unreadCount === 0}>
                        <CheckCheck className="mr-1.5 h-3.5 w-3.5"/> Mark all read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center justify-center h-full">
                      <Mailbox className="w-12 h-12 mb-3 text-muted-foreground/70" />
                      You have no notifications.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className={`flex flex-col items-start gap-1 whitespace-normal cursor-pointer ${!notification.read ? 'bg-accent/50 hover:bg-accent/70' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                        onSelect={(e) => e.preventDefault()} // Prevent auto-close for custom click handling
                      >
                        <div className="w-full flex justify-between items-center">
                           <span className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</span>
                           {!notification.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 ml-2"></div>}
                        </div>
                        {notification.body && <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>}
                        <p className="text-xs text-muted-foreground/70 self-end">
                          {formatDistanceToNowStrict(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearAllNotifications} className="text-sm text-destructive focus:text-destructive focus:bg-destructive/10 justify-center">
                       <Trash2 className="mr-2 h-4 w-4"/> Clear All Notifications
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                   <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || "User"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.displayName || "My Account"}</p>
                    {currentUser.email && <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/user"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/owner/register-club"><PlusCircle className="mr-2 h-4 w-4" />List Your Club</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOutIcon className="mr-2 h-4 w-4" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button asChild>
                <Link href="/register">
                  <UserPlus className="mr-2 h-4 w-4" /> Register
                </Link>
              </Button>
            </div>
          )}
          
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-8">
                    <Logo />
                  </div>
                  <nav className="flex flex-col space-y-4">
                    {allNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-lg font-medium transition-colors hover:text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <Separator className="my-2" />
                    {isAuthenticated ? (
                       <>
                        <Link href="/dashboard/user" className="text-lg font-medium transition-colors hover:text-primary flex items-center" onClick={() => setMobileMenuOpen(false)}>
                           <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
                        </Link>
                        <Link href="/dashboard/owner/register-club" className="text-lg font-medium transition-colors hover:text-primary flex items-center" onClick={() => setMobileMenuOpen(false)}>
                           <PlusCircle className="mr-2 h-5 w-5" /> List Your Club
                        </Link>
                        <Link href="/profile/settings" className="text-lg font-medium transition-colors hover:text-primary flex items-center" onClick={() => setMobileMenuOpen(false)}>
                           <Settings className="mr-2 h-5 w-5" /> Settings
                        </Link>
                        <Button variant="outline" onClick={handleLogout} className="w-full justify-start text-lg py-6 text-destructive hover:text-destructive">
                          <LogOutIcon className="mr-2 h-5 w-5" /> Log Out
                        </Button>
                       </>
                    ) : (
                      <>
                        <Button variant="outline" asChild className="w-full justify-start text-lg py-6">
                          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                            <LogIn className="mr-2 h-5 w-5" /> Login
                          </Link>
                        </Button>
                        <Button asChild className="w-full justify-start text-lg py-6">
                          <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                            <UserPlus className="mr-2 h-5 w-5" /> Register
                          </Link>
                        </Button>
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
