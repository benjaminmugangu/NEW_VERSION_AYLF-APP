// Test setup file
import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
    // Setup global test environment
    console.log('Test environment initialized');
    console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
});

afterAll(() => {
    // Cleanup test environment
    console.log('Test environment cleanup complete');
});
