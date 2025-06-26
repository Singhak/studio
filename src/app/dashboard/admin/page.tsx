
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Shield, CheckCircle, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import type { Club } from '@/lib/types';
import { getAllClubs, updateClubAdminStatus } from '@/services/clubService';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

type SortableClubKeys = keyof Pick<Club, 'name' | 'owner' | 'createdAt'>;

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableClubKeys; direction: 'ascending' | 'descending' } | null>({ key: 'createdAt', direction: 'descending' });

  const fetchClubs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedClubs = await getAllClubs();
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

  const requestSort = (key: SortableClubKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableClubKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const sortedAndFilteredClubs = useMemo(() => {
    let filteredClubs = [...clubs];
    if (filter) {
      filteredClubs = filteredClubs.filter(club =>
        club.name.toLowerCase().includes(filter.toLowerCase()) ||
        club.owner?.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      filteredClubs.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (aVal < bVal) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredClubs;
  }, [clubs, filter, sortConfig]);

  const handleStatusChange = async (clubId: string, field: 'isActive' | 'isFeatured', value: boolean) => {
    const originalClubs = clubs;
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
            <TableHead>
              <Button variant="ghost" onClick={() => requestSort('name')}>
                Club Name {getSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => requestSort('owner')}>
                Owner ID {getSortIcon('owner')}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => requestSort('createdAt')}>
                Created {getSortIcon('createdAt')}
              </Button>
            </TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Featured</TableHead>
            <TableHead className="text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAndFilteredClubs.map((club) => (
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
      <h1 className="text-3xl font-bold tracking-tight flex items-center"><Shield className="mr-3 h-8 w-8" />Admin Club Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Clubs</CardTitle>
          <CardDescription>
            Manage the status of all clubs. Click headers to sort or use the filter below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Filter by club name or owner ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
