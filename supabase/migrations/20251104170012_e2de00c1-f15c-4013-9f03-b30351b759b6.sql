-- Clean up business data so only Sartori has a valid business account

-- 1. Remove all location claims except for Sartori's B Bar
UPDATE locations 
SET claimed_by = NULL 
WHERE claimed_by IS NOT NULL 
AND claimed_by != 'cf9674e6-0561-4167-8a3c-c0f10fa95a69';

-- 2. Assign B Bar to Sartori (using the first B Bar location)
UPDATE locations 
SET claimed_by = 'cf9674e6-0561-4167-8a3c-c0f10fa95a69'
WHERE id = 'cc443454-664b-4706-a50e-bf5e8bde2523';

-- 3. Delete all business profiles except Sartori's
DELETE FROM business_profiles 
WHERE user_id != 'cf9674e6-0561-4167-8a3c-c0f10fa95a69';

-- 4. Ensure Sartori's business profile is verified and set to B Bar
UPDATE business_profiles 
SET 
  business_name = 'B Bar',
  verification_status = 'verified'
WHERE user_id = 'cf9674e6-0561-4167-8a3c-c0f10fa95a69';