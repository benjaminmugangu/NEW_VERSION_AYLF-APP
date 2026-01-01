-- Verification Queries for SC Bidirectional Linking
-- Run these in order

-- Query 1: All SC profiles with their siteId
SELECT id, name, email, role, "siteId" 
FROM profiles 
WHERE role = 'SITE_COORDINATOR';

-- Query 2: All sites with their coordinatorId status
SELECT id, name, "coordinatorId" 
FROM sites;

-- Query 3: Potential conflicts - multiple SC pointing to same site
SELECT "siteId", COUNT(*) as sc_count 
FROM profiles 
WHERE role = 'SITE_COORDINATOR' AND "siteId" IS NOT NULL 
GROUP BY "siteId" 
HAVING COUNT(*) > 1;
