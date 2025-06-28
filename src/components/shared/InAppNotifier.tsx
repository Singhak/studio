
"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { notificationEvents } from '@/lib/notificationEvents';
import { type AppNotification } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// We only need a subset of the AppNotification type for display
type ActiveNotification = Pick<AppNotification, 'title' | 'body' | 'href'>;

/**
 * A component that displays a prominent, temporary notification banner
 * at the top of the screen when an event is received.
 */
export function InAppNotifier() {
  const [notification, setNotification] = useState<ActiveNotification | null>(null);
  const router = useRouter();

  useEffect(() => {
    // This effect runs once to set up the listener.
    const handleNewNotification = (event: CustomEvent<ActiveNotification>) => {
      setNotification(event.detail);

      // Set a timer to automatically hide the notification
      const timer = setTimeout(() => {
        setNotification(null);
      }, 8000); // Hide after 8 seconds

      // Cleanup function to clear the timer if the component unmounts
      // or if a new notification arrives before the old one disappears.
      return () => clearTimeout(timer);
    };

    notificationEvents.listen(handleNewNotification);
    
    // Cleanup the listener when the component unmounts
    return () => notificationEvents.unlisten(handleNewNotification);
  }, []); // Empty dependency array ensures this runs only once on mount.

  // If there's no active notification, render nothing.
  if (!notification) {
    return null;
  }

  const handleAlertClick = () => {
    if (notification.href) {
      router.push(notification.href);
    }
    // Hide notification immediately on click
    setNotification(null);
  };

  return (
    // Position the notifier at the top-center of the viewport, on top of other content.
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[101] w-full max-w-md md:max-w-lg px-4">
      <Alert
        className={cn(
            "shadow-lg border-primary/20 bg-background animate-in fade-in-0 zoom-in-95 slide-in-from-top-4",
            notification.href && "cursor-pointer hover:bg-muted/50 transition-colors"
        )}
        onClick={handleAlertClick}
      >
        <Bell className="h-5 w-5 text-primary" />
        <AlertTitle>{notification.title}</AlertTitle>
        {notification.body && <AlertDescription>{notification.body}</AlertDescription>}
        <Button 
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={(e) => {
                e.stopPropagation(); // Prevent the main alert click handler from firing
                setNotification(null);
            }}
            aria-label="Dismiss notification"
        >
            <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
