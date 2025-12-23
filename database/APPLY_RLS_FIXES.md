# Applying RLS Security Fixes to Supabase

## Overview
This guide walks you through applying critical Row Level Security (RLS) fixes to your Supabase database. These changes enable the database to respect user identities from both Supabase Auth and the new Prisma security layer.

## Why Manual Application?
Due to connection pooling (PgBouncer) restrictions, we cannot execute these SQL statements programmatically via Prisma. Instead, you'll apply them directly through the Supabase dashboard.

## Steps

### 1. Access Supabase SQL Editor
1. Navigate to your Supabase project dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### 2. Copy and Execute the SQL
Copy the entire contents of `database/rls_prisma_fix.sql` and paste it into the SQL editor.

The SQL will create/update these functions:
- `get_my_id()` - Returns the current user ID from either Supabase Auth or Prisma session
- `get_my_role()` - Returns the current user's role
- `get_my_site_id()` - Returns the current user's site ID
- `get_my_small_group_id()` - Returns the current user's small group ID

### 3. Execute the Query
Click "Run" (or press Ctrl+Enter / Cmd+Enter)

### 4. Verify Success
You should see a success message: "Success. No rows returned"

This is expected! The functions are created, but they don't return data when run in isolation.

### 5. Test the Functions (Optional)
To verify the functions work correctly, you can run:

```sql
SELECT 
  get_my_id() as user_id,
  get_my_role() as role,
  get_my_site_id() as site_id,
  get_my_small_group_id() as small_group_id;
```

If you're not authenticated in the SQL editor, these will return NULL (which is correct behavior).

## What This Fixes

### Before:
- RLS policies only worked with Supabase Auth (`auth.uid()`)
- Prisma queries bypassed RLS entirely
- Identity desynchronization between Kinde and Supabase

### After:
- RLS policies work with both Supabase Auth AND Prisma
- User identity is automatically injected into database sessions
- Full security coverage across all data operations

## Verification

After applying these fixes, your application will:
1. ✅ Enforce Row Level Security for all Prisma queries
2. ✅ Respect user roles and permissions at the database level
3. ✅ Prevent unauthorized data access even if application logic is bypassed
4. ✅ Maintain a unified security model across all access patterns

## Troubleshooting

**Issue**: "function get_my_id() does not exist"
**Solution**: Ensure you're running the query in the correct database. Check the database selector in the top-right of the SQL editor.

**Issue**: "permission denied for schema public"
**Solution**: Make sure you're logged in as the database owner or have sufficient privileges.

## Next Steps

After applying these SQL fixes:
1. Restart your Next.js development server
2. Test creating/viewing activities, reports, sites, and small groups
3. Verify that users can only see data within their scope
4. Monitor application logs for any RLS-related errors

## Files Modified

- `database/rls_prisma_fix.sql` - The SQL script to execute
- `src/lib/prisma.ts` - Prisma client with RLS support
- `src/lib/apiWrapper.ts` - API wrapper for automatic RLS context
- `src/middleware.ts` - Hardened middleware for API security
