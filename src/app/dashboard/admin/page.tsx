
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Shield, CheckCircle, XCircle } from "lucide-react";
import type { Club } from '@/lib/types';
import { getAllClubs, updateClubAdminStatus } from '@/services/clubService';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClubs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedClubs = await getAllClubs();
      fetchedClubs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setClubs(fetchedClubs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load clubs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleStatusChange = async (clubId: string, field: 'isActive' | 'isFeatured', value: boolean) => {
    const originalClubs = clubs;
    // Optimistic UI update
    setClubs(prevClubs =>
      prevClubs.map(c =>
        c._id === clubId ? { ...c, [field]: value } : c
      )
    );

    try {
      await updateClubAdminStatus(clubId, { [field]: value });
      toast({
        toastTitle: "Club Updated Successfully",
        toastDescription: `Club's ${field === 'isActive' ? 'active' : 'featured'} status has been changed.`,
      });
    } catch (err) {
      // Revert on error
      setClubs(originalClubs);
      toast({
        variant: "destructive",
        toastTitle: "Update Failed",
        toastDescription: err instanceof Error ? err.message : "Could not update the club status.",
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-12"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>;
    }

    if (error) {
      return (
        <div className="text-center py-12 text-destructive">
          <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
          <p className="font-semibold text-lg">Error Loading Clubs</p>
          <p className="text-sm">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchClubs}>Try Again</Button>
        </div>
      );
    }

    if (clubs.length === 0) {
      return <p className="text-muted-foreground text-center py-12">No clubs found in the system.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Club Name</TableHead>
            <TableHead>Owner ID</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Featured</TableHead>
            <TableHead className="text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clubs.map((club) => (
            <TableRow key={club._id}>
              <TableCell className="font-medium">{club.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{club.owner?.slice(-6) ?? 'N/A'}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{club.createdAt ? format(new Date(club.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
              <TableCell className="text-center">
                 <Switch
                    id={`active-${club._id}`}
                    checked={club.isActive}
                    onCheckedChange={(value) => handleStatusChange(club._id, 'isActive', value)}
                    aria-label={`Toggle active status for ${club.name}`}
                  />
              </TableCell>
              <TableCell className="text-center">
                 <Switch
                    id={`featured-${club._id}`}
                    checked={club.isFeatured}
                    onCheckedChange={(value) => handleStatusChange(club._id, 'isFeatured', value)}
                    aria-label={`Toggle featured status for ${club.name}`}
                  />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/clubs/${club._id}`}>View Page</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center"><Shield className="mr-3 h-8 w-8"/>Admin Club Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Clubs</CardTitle>
          <CardDescription>
            Manage the status of all clubs in the system. Changes are saved instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
