# Pre-Launch Checklist

## Items to Review/Change Before Launch

### 1. Modal Restrictions ⚠️ **CRITICAL**
- **Locations**: 
  - `showFirstScanUpsellModal()` function (around line 9262)
  - `showLastScanUpsellModal()` function (around line 9312)
- **Current Status**: Once-per-day restrictions are DISABLED for testing
- **Action Required**: Uncomment the localStorage checks to re-enable once-per-day restrictions
  - Uncomment lines that check `firstScanModalShown` and `lastScanModalShown`
  - Uncomment lines that set `localStorage.setItem(...)`
  - Remove the "TEST MODE" comment blocks

### 2. Backend API URLs ⚠️ **CRITICAL**
- **Locations**: 
  - Line ~7991: `const BACKEND_URL = 'http://localhost:8081';`
  - Line ~8246: `backendUrl: 'http://localhost:8081/quickfix'`
  - Line ~14464: `const BACKEND_URL = 'http://localhost:8081';`
- **Action Required**: Replace `localhost:8081` with production backend URL
  - Search for all instances of `localhost:8081`
  - Replace with production URL (e.g., `https://api.yourdomain.com`)

### 3. Dev Mode Presets
- **Location**: `scanEssay()` function (around line 11451-11542)
- **Current Status**: Protected by `?dev=true` URL parameter AND localhost check
- **Action Required**: Review to ensure it only works in development
  - Currently requires: `?dev=true` in URL AND `localhost` or `127.0.0.1`
  - Should be safe for production, but double-check that presets aren't accidentally enabled

### 4. Test Mode Functions
- **Location**: 
  - `activateProTestMode()` function (around line 14400)
  - `addProTestButton()` function (around line 14422)
- **Current Status**: These functions exist but aren't automatically called
- **Action Required**: Decide if these should be removed entirely or kept for admin/testing
  - If kept, ensure they're only accessible in development
  - Consider removing `addProTestButton()` entirely if not needed

### 5. Stripe Test Mode
- **Location**: `showStripePaymentModal()` function (around line 14097-14134)
- **Current Status**: Has localhost check for test mode activation
- **Action Required**: 
  - Verify Stripe keys are configured for production
  - Ensure `activateProTestMode()` is NOT called in production
  - Test that payment flow works correctly in production

### 6. Console Logs
- **Action Required**: Review all `console.log()` statements
  - Consider removing or converting to conditional logs for production
  - Look for sensitive information being logged

### 7. Character Limits
- **Location**: Check for 500 character limit for free scans
- **Action Required**: Verify this is the desired limit for production

### 8. Scan Limits
- **Location**: `FREE_SCAN_LIMIT` constant (around line 4892)
- **Current Value**: 3 scans per day
- **Action Required**: Verify this is the desired limit for production

---

## Quick Find Commands

To find all test/dev mode related code:
- Search for: `localhost:8081`
- Search for: `TEST MODE`
- Search for: `DEV MODE`
- Search for: `activateProTestMode`
- Search for: `firstScanModalShown`

