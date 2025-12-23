// Script to batch wrap remaining GET routes with withApiRLS
// Routes restantes: analytics, audit-logs, certificates/eligible-users, 
// cron/daily+update, finances/export×2, invitations/accept

// ANALYTICS
// analytics/route.ts - Simple wrapper
await wrap('api/analytics/route.ts');

// AUDIT-LOGS  
// audit-logs/route.ts - Simple wrapper
await wrap('api/audit-logs/route.ts');

// CERTIFICATES
// certificates/eligible-users/route.ts - Simple wrapper
await wrap('api/certificates/eligible-users/route.ts');

// INVITATIONS
// invitations/accept/route.ts - Simple wrapper
await wrap('api/invitations/accept/route.ts');

// FINANCES EXPORT
// finances/export/allocations/route.ts - Simple wrapper
await wrap('api/finances/export/allocations/route.ts');

// finances/export/transactions/route.ts - Simple wrapper
await wrap('api/finances/export/transactions/route.ts');

// CRON (Authenticated cron jobs)
// cron/daily-reminders/route.ts -apper
await wrap('api/cron/daily-reminders/route.ts');

// cron/update-activities/route.ts - Simple wrapper
await wrap('api/cron/update-activities/route.ts');

// Note: auth/me should NOT be wrapped - it establishes identity
