# Security Fixes Summary

## ✅ Issues Fixed (SQL Migrations)

### 1. Function Search Path Security (Fixed 14 functions)
**Issue:** Functions without `SET search_path` are vulnerable to search path attacks
**Impact:** High - Could allow SQL injection through schema manipulation
**Status:** ✅ Fixed

Fixed the following functions by adding `SET search_path = public`:
- `cleanup_old_analytics()`
- `cleanup_expired_stories()`
- `cleanup_expired_location_shares()`
- `update_location_share_timestamp()`
- `update_updated_at_column()`
- `update_thread_last_message()`
- `update_post_comments_count()`
- `update_post_likes_count()`
- `update_post_saves_count()`
- `update_post_shares_count()`
- `update_comment_likes_count()`
- `update_posts_count_on_insert()`
- `update_posts_count_on_delete()`
- `update_user_stats()`
- `update_super_user_points()`

### 2. RLS Policy Missing on `otp_codes` Table
**Issue:** Table had RLS enabled but no policies defined
**Impact:** High - OTP codes could be accessed without proper authorization
**Status:** ✅ Fixed

Added three RLS policies:
1. **Insert Policy**: Allows anyone to request OTP codes
2. **Select Policy**: Users can only read their own OTP codes (matched by email/phone)
3. **Delete Policy**: System can automatically delete expired OTP codes

---

## ⚠️ Remaining Warnings (Require Manual Fixes)

### 1. Function Search Path Mutable (2 remaining functions)
**Issue:** Two functions still don't have `SET search_path`
**Impact:** Medium - Potential for schema manipulation attacks
**Action Required:** These are likely extension functions (`unaccent` related) that cannot be modified directly

**How to identify:**
```sql
SELECT 
  p.proname,
  n.nspname,
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_proc_config pc
    WHERE pc.proconfig @> ARRAY['search_path=public']
  )
  AND n.nspname = 'public'
ORDER BY p.proname;
```

### 2. Extension in Public Schema
**Issue:** The `unaccent` extension is installed in the public schema
**Impact:** Low - Extensions in public schema can interfere with application tables
**Recommended Fix:** Move extensions to a dedicated schema

**Action Required:**
```sql
-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move unaccent extension (requires superuser privileges)
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Update search path in config
ALTER DATABASE postgres SET search_path TO public, extensions;
```

**Note:** This may require coordination with Supabase support or project owner privileges.

### 3. Auth OTP Long Expiry
**Issue:** OTP expiry time exceeds recommended security threshold
**Impact:** Medium - Longer OTP validity increases attack window
**Recommended Setting:** OTP should expire within 5-10 minutes

**Action Required:**
1. Navigate to: [Supabase Dashboard](https://supabase.com/dashboard/project/hrmklsvewmhpqixgyjmy/auth/providers)
2. Go to **Authentication** → **Providers** → **Email**
3. Under **Email Templates**, adjust OTP expiry to `300` seconds (5 minutes) or `600` seconds (10 minutes)
4. Save changes

### 4. Leaked Password Protection Disabled
**Issue:** Compromised password detection is not enabled
**Impact:** Medium - Users can set passwords that have been leaked in data breaches
**Recommended:** Enable Have I Been Pwned integration

**Action Required:**
1. Navigate to: [Supabase Dashboard](https://supabase.com/dashboard/project/hrmklsvewmhpqixgyjmy/auth/policies)
2. Go to **Authentication** → **Policies**
3. Enable **"Leaked password protection"**
4. This will check passwords against the Have I Been Pwned database
5. Save changes

---

## 📊 Security Status Summary

| Issue Type | Total | Fixed | Remaining |
|------------|-------|-------|-----------|
| Function Search Path | 16 | 14 | 2 |
| RLS Policy Missing | 1 | 1 | 0 |
| Extension Location | 1 | 0 | 1 |
| Auth Configuration | 2 | 0 | 2 |
| **Total** | **20** | **15** | **5** |

**Security Score: 75% Complete** 🟢

---

## 🔒 Security Best Practices Going Forward

1. **All new functions must include:**
   ```sql
   SECURITY DEFINER
   SET search_path = public
   ```

2. **All new tables must have:**
   - RLS enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
   - At least one policy for each operation (SELECT, INSERT, UPDATE, DELETE)

3. **OTP Codes:**
   - Keep expiry under 10 minutes
   - Implement rate limiting for OTP requests
   - Log failed verification attempts

4. **Password Security:**
   - Enforce minimum password strength
   - Enable leaked password protection
   - Implement account lockout after failed attempts

5. **Regular Security Audits:**
   - Run `supabase db lint` monthly
   - Review RLS policies quarterly
   - Update dependencies regularly

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Function Security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker)
- [Password Security Guide](https://supabase.com/docs/guides/auth/password-security)

---

**Last Updated:** November 22, 2025
**Project:** Spott (hrmklsvewmhpqixgyjmy)
