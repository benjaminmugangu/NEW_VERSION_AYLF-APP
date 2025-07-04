// src/services/activityTypeService.ts

import type { ActivityType, ServiceResponse } from '@/lib/types';

// To simulate a database, we'll use a simple in-memory array.
let mockActivityTypes: ActivityType[] = [
    { id: 'at-1', name: 'Réunion de planification' },
    { id: 'at-2', name: 'Workshop' },
    { id: 'at-3', name: 'Service Communautaire' },
    { id: 'at-4', name: 'Réunion de Petit Groupe' },
    { id: 'at-5', name: 'Événement Sportif' },
    { id: 'at-6', name: 'Conférence' },
    { id: 'at-7', name: 'Réunion en Ligne' },
    { id: 'at-8', name: 'Programme de Mentorat' },
    { id: 'at-9', name: 'Séminaire' },
    { id: 'at-10', name: 'Levée de Fonds' },
    { id: 'at-11', name: 'Autre' },
];

// Simulate API latency
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches all available activity types.
 * @returns A ServiceResponse containing the list of all activity types.
 */
export const getAllActivityTypes = async (): Promise<ServiceResponse<ActivityType[]>> => {
    await sleep(300); // Simulate network delay
    try {
        // In a real application, this would be a fetch call to an API endpoint.
        // e.g., const response = await fetch('/api/activity-types');
        return { success: true, data: [...mockActivityTypes] };
    } catch (error) {
        console.error('Error fetching activity types:', error);
        return { success: false, error: 'An error occurred while fetching activity types.' };
    }
};

/**
 * Fetches a single activity type by its ID.
 * @param id The ID of the activity type to fetch.
 * @returns A ServiceResponse containing the activity type or an error.
 */
export const getActivityTypeById = async (id: string): Promise<ServiceResponse<ActivityType>> => {
    await sleep(200);
    try {
        const activityType = mockActivityTypes.find(at => at.id === id);
        if (activityType) {
            return { success: true, data: activityType };
        }
        return { success: false, error: 'Activity type not found.' };
    } catch (error) {
        console.error(`Error fetching activity type with id ${id}:`, error);
        return { success: false, error: 'An error occurred while fetching the activity type.' };
    }
};
