-- Populate Real AYLF Data
-- Sites: Beni, Bukavu, Bunia, Butembo, Goma, Kalemie, Kinshasa, Lubumbashi, Uvira

-- 1. Insert Sites
INSERT INTO "sites" (id, name, city, country, created_at, updated_at) VALUES
('site-beni', 'Beni', 'Beni', 'RDC', NOW(), NOW()),
('site-bukavu', 'Bukavu', 'Bukavu', 'RDC', NOW(), NOW()),
('site-bunia', 'Bunia', 'Bunia', 'RDC', NOW(), NOW()),
('site-butembo', 'Butembo', 'Butembo', 'RDC', NOW(), NOW()),
('site-goma', 'Goma', 'Goma', 'RDC', NOW(), NOW()),
('site-kalemie', 'Kalemie', 'Kalemie', 'RDC', NOW(), NOW()),
('site-kinshasa', 'Kinshasa', 'Kinshasa', 'RDC', NOW(), NOW()),
('site-lubumbashi', 'Lubumbashi', 'Lubumbashi', 'RDC', NOW(), NOW()),
('site-uvira', 'Uvira', 'Uvira', 'RDC', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Small Groups
-- Beni (5)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-beni-alumni', 'ALUMNI', 'site-beni', NOW(), NOW()),
('group-beni-isc', 'ISC', 'site-beni', NOW(), NOW()),
('group-beni-uac', 'UAC', 'site-beni', NOW(), NOW()),
('group-beni-ucbc', 'UCBC', 'site-beni', NOW(), NOW()),
('group-beni-uos', 'UOS', 'site-beni', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Bukavu (6)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-bukavu-alumni', 'ALUMNI', 'site-bukavu', NOW(), NOW()),
('group-bukavu-isdr', 'ISDR', 'site-bukavu', NOW(), NOW()),
('group-bukavu-isp', 'ISP', 'site-bukavu', NOW(), NOW()),
('group-bukavu-uea', 'UEA', 'site-bukavu', NOW(), NOW()),
('group-bukavu-isecof', 'ISECOF', 'site-bukavu', NOW(), NOW()),
('group-bukavu-uob', 'UOB', 'site-bukavu', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Bunia (3)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-bunia-alumni', 'ALUMNI', 'site-bunia', NOW(), NOW()),
('group-bunia-unibu', 'UNIBU', 'site-bunia', NOW(), NOW()),
('group-bunia-unshalom', 'UN.SHALOM', 'site-bunia', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Butembo (4)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-butembo-alumni', 'ALUMNI', 'site-butembo', NOW(), NOW()),
('group-butembo-uac', 'UAC', 'site-butembo', NOW(), NOW()),
('group-butembo-ucg', 'UCG', 'site-butembo', NOW(), NOW()),
('group-butembo-uor', 'UOR', 'site-butembo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Goma (6)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-goma-alumni', 'ALUMNI', 'site-goma', NOW(), NOW()),
('group-goma-isig', 'ISIG', 'site-goma', NOW(), NOW()),
('group-goma-ucs', 'UCS', 'site-goma', NOW(), NOW()),
('group-goma-ulpgl', 'ULPGL', 'site-goma', NOW(), NOW()),
('group-goma-unigom', 'UNIGOM', 'site-goma', NOW(), NOW()),
('group-goma-unim', 'UNIM', 'site-goma', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Kalemie (5)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-kalemie-alumni', 'ALUMNI', 'site-kalemie', NOW(), NOW()),
('group-kalemie-isp', 'ISP', 'site-kalemie', NOW(), NOW()),
('group-kalemie-istm', 'ISTM', 'site-kalemie', NOW(), NOW()),
('group-kalemie-isss', 'ISSS', 'site-kalemie', NOW(), NOW()),
('group-kalemie-unikal', 'UNIKAL', 'site-kalemie', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Kinshasa (3)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-kinshasa-alumni', 'ALUMNI', 'site-kinshasa', NOW(), NOW()),
('group-kinshasa-unikin', 'UNIKIN', 'site-kinshasa', NOW(), NOW()),
('group-kinshasa-unimkin', 'UNIM/Kin', 'site-kinshasa', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Lubumbashi (2)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-lubumbashi-alumni', 'ALUMNI', 'site-lubumbashi', NOW(), NOW()),
('group-lubumbashi-unilu', 'UNILU', 'site-lubumbashi', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Uvira (6)
INSERT INTO "small_groups" (id, name, site_id, created_at, updated_at) VALUES
('group-uvira-alumni', 'ALUMNI', 'site-uvira', NOW(), NOW()),
('group-uvira-isc', 'ISC', 'site-uvira', NOW(), NOW()),
('group-uvira-isdr', 'ISDR', 'site-uvira', NOW(), NOW()),
('group-uvira-isp', 'ISP', 'site-uvira', NOW(), NOW()),
('group-uvira-istm', 'ISTM', 'site-uvira', NOW(), NOW()),
('group-uvira-undt', 'UNDT', 'site-uvira', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Activity Types
INSERT INTO "activity_types" (id, name, category, description) VALUES
('type-sgm', 'small_group_meeting', 'spiritual', 'Regular small group meeting'),
('type-conf', 'conference', 'training', 'Training or leadership conference'),
('type-apo', 'apostolat', 'outreach', 'Outreach and community service'),
('type-deuil', 'deuil', 'community', 'Support during mourning')
ON CONFLICT (id) DO NOTHING;
