
"use client";

import Link from 'next/link';
import { Bell, UserCircle, LogIn, UserPlus, Menu, LogOut as LogOutIcon, Settings, LayoutDashboard, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const baseNavLinks = [
  { href: '/clubs', label: 'Find Clubs' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logoutUser, loading } = useAuth();

  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    await logoutUser();
    setMobileMenuOpen(false);
  };
  
  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "?";

  // Dynamic links based on auth state
  let allNavLinks = [...baseNavLinks];
  if (isAuthenticated) {
    allNavLinks.push({ href: '/dashboard/user', label: 'My Bookings' });
    // "My Club" / "Owner Dashboard" is better accessed via the user dropdown leading to the main dashboard
    // where the view switcher (if applicable) resides.
  }


  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Logo />
          <div className="h-6 w-20 animate-pulse rounded-md bg-muted"></div>
        </div>
      </header>
    );
  }

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

        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated && (
            <Button variant="ghost" size="icon" aria-label="Notifications" className="hidden sm:inline-flex">
                <Bell className="h-5 w-5" />
            </Button>
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
                  <Logo className="mb-8" />
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
