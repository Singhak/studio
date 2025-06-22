
"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getLoggedInOwnerClubs, getClubById } from '@/services/clubService';
import { EditClubForm } from '@/components/features/clubs/EditClubForm';
import type { Club } from '@/lib/types';
import { Loader2, AlertTriangle, ArrowLeft, ClubIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ClubSettingsContent() {
    const { toast } = useToast();
    const [ownerClubs, setOwnerClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [clubsError, setClubsError] = useState<string | null>(null);

    const [clubToEdit, setClubToEdit] = useState<Club | null | undefined>(undefined);
    const [isLoadingClubDetails, setIsLoadingClubDetails] = useState(false);
    const [clubDetailsError, setClubDetailsError] = useState<string | null>(null);

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
                    setClubsError("You do not own any clubs to configure.");
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

    const fetchClubForEditing = useCallback(async () => {
        if (!selectedClubId) {
            setClubToEdit(null);
            return;
        }
        setIsLoadingClubDetails(true);
        setClubDetailsError(null);
        try {
            const fetchedClub = await getClubById(selectedClubId);
            setClubToEdit(fetchedClub);
            if (!fetchedClub) {
                setClubDetailsError("Could not find the selected club's details.");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An error occurred fetching club details.";
            setClubDetailsError(msg);
            toast({ variant: "destructive", toastTitle: "Error", toastDescription: msg });
        } finally {
            setIsLoadingClubDetails(false);
        }
    }, [selectedClubId, toast]);

    useEffect(() => {
        fetchClubForEditing();
    }, [fetchClubForEditing]);

    if (isLoadingClubs) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your clubs...</p>
            </div>
        );
    }
    
    if (clubsError || ownerClubs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">Error</h2>
                <p className="text-muted-foreground mb-6 max-w-md">{clubsError || 'No clubs found.'}</p>
                <Button asChild variant="outline">
                    <Link href="/dashboard/owner">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {ownerClubs.length > 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                           <ClubIcon className="mr-2 h-5 w-5"/> Select Club to Edit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger id="club-selector-settings" aria-label="Select club to edit">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {ownerClubs.map((club) => (
                                    <SelectItem key={club._id} value={club._id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            {isLoadingClubDetails ? (
                 <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading settings for {ownerClubs.find(c=>c._id === selectedClubId)?.name}...</p>
                </div>
            ) : clubDetailsError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-destructive">
                    <AlertTriangle className="h-16 w-16 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Error Loading Settings</h2>
                    <p>{clubDetailsError}</p>
                </div>
            ) : clubToEdit ? (
                <EditClubForm club={clubToEdit} />
            ) : (
                 <div className="py-12 text-center text-muted-foreground">
                    <p>Select a club to view its settings.</p>
                </div>
            )}
        </div>
    );
}

export default function ClubSettingsPage() {
    return (
        <div className="py-8">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading page...</p>
                </div>
            }>
                <ClubSettingsContent />
            </Suspense>
        </div>
    );
}
