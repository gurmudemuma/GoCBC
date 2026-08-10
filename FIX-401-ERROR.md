# Fix 401 Unauthorized Error After Restart

## Quick Fix (10 seconds)

1. Open browser console (F12)
2. Type: `localStorage.clear()`
3. Press Enter
4. Refresh page (F5)
5. Login again

Your data is safe - only your browser session needs to be cleared.

## Why This Happens

- JWT tokens in browser localStorage become invalid after API restart
- The token refresh mechanism tries to renew but fails if JWT_SECRET changed
- Solution: Clear browser cache and get new token

## Permanent Fix

The system now:
- Uses fixed JWT_SECRET (doesn't change on restart)
- 7-day token expiry (was 24 hours)
- Auto-refresh tokens before they expire

You should not see this error again.
