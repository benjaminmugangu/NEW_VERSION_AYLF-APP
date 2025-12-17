
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mocking the Schema Logic directly used in Forms
// This represents the mandate validation logic we want to enforce

const mandateSchema = z.object({
    mandateStartDate: z.string().optional(),
    mandateEndDate: z.string().optional(),
}).refine((data) => {
    if (data.mandateStartDate && data.mandateEndDate) {
        return new Date(data.mandateStartDate) <= new Date(data.mandateEndDate);
    }
    return true;
}, {
    message: "End date must be after start date",
    path: ["mandateEndDate"],
});

describe('Mandate Logic Validation', () => {
    it('should accept valid mandate dates', () => {
        const validData = {
            mandateStartDate: '2023-01-01',
            mandateEndDate: '2023-12-31',
        };
        const result = mandateSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('should REJECT if End Date is before Start Date', () => {
        const invalidData = {
            mandateStartDate: '2023-12-31',
            mandateEndDate: '2023-01-01', // Oops, backwards
        };
        const result = mandateSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("End date must be after start date");
        }
    });

    it('should accept Open-Ended mandates (No End Date)', () => {
        const openEnded = {
            mandateStartDate: '2023-01-01',
            // No End Date
        };
        const result = mandateSchema.safeParse(openEnded);
        expect(result.success).toBe(true);
    });
});
