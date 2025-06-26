
"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Edit, Trash2, ListChecks, Loader2, AlertTriangle, ShoppingBag, CheckCircle, XCircle, ClubIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { Club, Service } from '@/lib/types';
import { getLoggedInOwnerClubs, getServicesByClubId } from '@/services/clubService';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AddServiceForm } from '@/components/features/services/AddServiceForm';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type SortableServiceKeys = keyof Pick<Service, 'name' | 'sportType' | 'hourlyPrice' | 'slotDurationMinutes' | 'isActive'>;

function ManageServicesContent() {
  const { toast } = useToast();
  const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [clubsError, setClubsError] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);

  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableServiceKeys; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

  useEffect(() => {
    const fetchOwnerClubs = async () => {
      setIsLoadingClubs(true);
      setClubsError(null);
      try {
        const clubs = await getLoggedInOwnerClubs();
        setOwnerClubs(clubs);
        if (clubs.length > 0) {
          setSelectedClubId(clubs[0]._id);
        } else {
          setClubsError("You do not own any clubs. Please register one first.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load your clubs.";
        setClubsError(msg);
        toast({ variant: "destructive", toastTitle: "Error Loading Clubs", toastDescription: msg });
      } finally {
        setIsLoadingClubs(false);
      }
    };
    fetchOwnerClubs();
  }, [toast]);

  const fetchServicesForClub = useCallback(async () => {
    if (!selectedClubId) {
      setServices([]);
      return;
    }
    setIsLoadingServices(true);
    setServicesError(null);
    try {
      const fetchedServices = await getServicesByClubId(selectedClubId);
      setServices(fetchedServices || []);
    } catch (err) {
      setServicesError(err instanceof Error ? err.message : "Failed to load services for this club.");
    } finally {
      setIsLoadingServices(false);
    }
  }, [selectedClubId]);

  useEffect(() => {
    fetchServicesForClub();
  }, [fetchServicesForClub]);

  const requestSort = (key: SortableServiceKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortableServiceKeys) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };
  
  const sortedAndFilteredServices = useMemo(() => {
    let filteredServices = [...services];
    if (filter) {
      filteredServices = filteredServices.filter(service =>
        service.name.toLowerCase().includes(filter.toLowerCase()) ||
        service.sportType.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      filteredServices.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filteredServices;
  }, [services, filter, sortConfig]);

  const handleServiceAdded = (newService: Service) => {
    setServices(prevServices => [...prevServices, newService]);
    setIsAddServiceDialogOpen(false);
  };
  
  const selectedClub = ownerClubs.find(c => c._id === selectedClubId);

  if (isLoadingClubs) return (<div className="flex flex-col items-center justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Loading your clubs...</p></div>);
  if (clubsError || ownerClubs.length === 0) return (<div className="flex flex-col items-center justify-center py-12 text-center"><AlertTriangle className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-foreground mb-2">Error</h2><p className="text-muted-foreground mb-6 max-w-md">{clubsError || 'No clubs found.'}</p><Button asChild variant="outline"><Link href="/dashboard/owner"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link></Button></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Manage Services</h1><p className="text-muted-foreground">Add, edit, or remove services offered at your club.</p></div>
        <Button asChild variant="outline"><Link href="/dashboard/owner"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link></Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div><CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Services for {selectedClub?.name}</CardTitle><CardDescription>Define the services your club offers, such as court rentals, coaching, etc.</CardDescription></div>
          {ownerClubs.length > 1 && (<div className="w-full sm:w-auto sm:min-w-[200px]"><Select value={selectedClubId} onValueChange={setSelectedClubId}><SelectTrigger id="club-selector-services" aria-label="Select club to manage services for"><SelectValue placeholder="Select a club..." /></SelectTrigger><SelectContent>{ownerClubs.map((club) => (<SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>))}</SelectContent></Select></div>)}
        </CardHeader>
        <CardContent>
          {isLoadingServices ? (<div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>) : servicesError ? (<div className="py-8 text-center text-destructive"><AlertTriangle className="mx-auto h-8 w-8 mb-2" /><p>{servicesError}</p></div>) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                  <Input 
                    placeholder="Filter by service name or sport..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                  />
                  <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
                      <DialogTrigger asChild><Button onClick={() => setIsAddServiceDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add New Service</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-2xl"><AddServiceForm clubId={selectedClubId} onServiceAdded={handleServiceAdded} onClose={() => setIsAddServiceDialogOpen(false)}/></DialogContent>
                  </Dialog>
              </div>
              {sortedAndFilteredServices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Service Name {getSortIcon('name')}</Button></TableHead>
                      <TableHead><Button variant="ghost" onClick={() => requestSort('sportType')}>Sport {getSortIcon('sportType')}</Button></TableHead>
                      <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('hourlyPrice')}>Price/Hour {getSortIcon('hourlyPrice')}</Button></TableHead>
                      <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('slotDurationMinutes')}>Duration (min) {getSortIcon('slotDurationMinutes')}</Button></TableHead>
                      <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('isActive')}>Active {getSortIcon('isActive')}</Button></TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredServices.map((service) => (
                      <TableRow key={service._id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell><Badge variant="secondary">{service.sportType}</Badge></TableCell>
                        <TableCell className="text-right">${service.hourlyPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{service.slotDurationMinutes || 'N/A'}</TableCell>
                        <TableCell className="text-center">{service.isActive ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}</TableCell>
                        <TableCell className="text-right space-x-1"><Button variant="ghost" size="icon" title="Edit Service" onClick={() => alert(`Placeholder: Edit service ${service.name}`)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete Service" className="text-destructive hover:text-destructive/90" onClick={() => alert(`Placeholder: Delete service ${service.name}`)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-lg">
                  <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold text-muted-foreground">No Services Found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filter ? `No services match "${filter}".` : `No services configured yet for ${selectedClub?.name}.`}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
        {services.length > 0 && (<CardFooter className="justify-end"><p className="text-xs text-muted-foreground">Total services: {services.length}</p></CardFooter>)}
      </Card>
    </div>
  );
}

export default function ManageServicesPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-muted-foreground">Loading page...</p></div>}>
      <ManageServicesContent />
    </Suspense>
  );
}
