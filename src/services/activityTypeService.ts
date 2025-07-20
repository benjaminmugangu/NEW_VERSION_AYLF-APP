// src/services/activityTypeService.ts

import type { ActivityType, ServiceResponse } from '@/lib/types';

// To simulate a database, we'll use a simple in-memory array.
let mockActivityTypes: ActivityType[] = [
    { id: 'at-1', name: 'Réunion de planification', category: 'training' },
    { id: 'at-2', name: 'Workshop', category: 'training' },
    { id: 'at-3', name: 'Service Communautaire', category: 'community' },
    { id: 'at-4', name: 'Réunion de Petit Groupe', category: 'spiritual' },
    { id: 'at-5', name: 'Événement Sportif', category: 'community' },
    { id: 'at-6', name: 'Conférence', category: 'training' },
    { id: 'at-7', name: 'Réunion en Ligne', category: 'training' },
    { id: 'at-8', name: 'Programme de Mentorat', category: 'training' },
    { id: 'at-9', name: 'Séminaire', category: 'training' },
    { id: 'at-10', name: 'Levée de Fonds', category: 'outreach' },
    { id: 'at-11', name: 'Autre', category: 'community' },
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

        return { success: false, error: { message: 'An error occurred while fetching activity types.' } };
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
        return { success: false, error: { message: 'Activity type not found.' } };
    } catch (error) {

        return { success: false, error: { message: 'An error occurred while fetching the activity type.' } };
    }
};
