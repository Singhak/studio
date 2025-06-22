
"use client";

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getClubById } from '@/services/clubService';
import { EditClubForm } from '@/components/features/clubs/EditClubForm';
import type { Club } from '@/lib/types';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ClubSettingsContent() {
    const searchParams = useSearchParams();
    const clubId = searchParams.get('clubId');
    const [club, setClub] = useState<Club | null | undefined>(undefined); // undefined: loading, null: not found/error
    const [error, setError] = useState<string | null>(null);

    const fetchClubData = useCallback(async () => {
        if (!clubId) {
            setError("No club ID provided in the URL.");
            setClub(null);
            return;
        }
        setClub(undefined); // Set to loading state
        setError(null);
        try {
            const fetchedClub = await getClubById(clubId);
            if (fetchedClub) {
                setClub(fetchedClub);
            } else {
                setClub(null);
                setError(`Could not find details for the club with ID: ${clubId}. It may have been deleted.`);
            }
        } catch (err) {
            console.error("Failed to fetch club for settings page:", err);
            setClub(null);
            setError(err instanceof Error ? err.message : "An unknown error occurred while fetching club data.");
        }
    }, [clubId]);

    useEffect(() => {
        fetchClubData();
    }, [fetchClubData]);

    if (club === undefined) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading club details...</p>
            </div>
        );
    }
    
    if (error || !club) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {clubId && !club && !error ? 'Club Not Found' : 'Error Loading Club'}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    {error || 'The requested club could not be loaded or does not exist.'}
                </p>
                <Button asChild variant="outline">
                    <Link href="/dashboard/owner">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Owner Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return <EditClubForm club={club} />;
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
