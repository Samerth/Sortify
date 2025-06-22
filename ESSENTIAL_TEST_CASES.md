# Essential Test Cases for End Users

## Minimum Test Cases for Seamless User Experience

### 1. User Registration & Login (5 minutes)
**Positive Flow:**
- Visit landing page → "Start Free Trial" → Fill form → Auto-login → Organization setup
- Login with existing credentials → Dashboard access

**Negative Flow:**
- Try duplicate email registration (should show error)
- Wrong password login (should show clear error)

### 2. Organization Setup (3 minutes)
**Positive Flow:**
- Create organization with valid name and details
- Verify trial status shows "7 days remaining"

**Negative Flow:**
- Submit empty organization form (should prevent submission)

### 3. Package Management - Core Flow (10 minutes)
**Positive Flow:**
- Mail Intake → Fill all fields → Assign location → Submit
- Check package appears in "Pending Pickups"
- Mark package as "Delivered" → Verify status change
- Search for package by tracking number

**Negative Flow:**
- Submit package form with missing required fields (should show validation)
- Search for non-existent tracking number (should show "no results")

### 4. Recipient Management (5 minutes)
**Positive Flow:**
- Add new recipient with email and phone
- Edit existing recipient information
- Search for recipient by name

**Negative Flow:**
- Try creating recipient with invalid email format (should show error)

### 5. Dashboard & Statistics (2 minutes)
**Positive Flow:**
- Verify "Today's Mail" count updates after adding package
- Check "Pending Pickups" count is accurate
- Confirm recent activity shows latest packages

### 6. Storage Locations (3 minutes)
**Positive Flow:**
- Create mailroom (e.g., "Main Building")
- Add storage location (e.g., "Shelf A1")
- Assign package to specific location during intake

### 7. Trial & Upgrade Flow (3 minutes)
**Positive Flow:**
- Click "Upgrade License" button → Navigate to checkout
- Select plan (Starter/Professional/Enterprise)
- Verify pricing displays correctly

**Negative Flow:**
- Try adding more packages than trial limit allows

### 8. Team Management (3 minutes)
**Positive Flow:**
- Settings → Team → Invite member with email
- Verify invitation shows in pending list

**Negative Flow:**
- Try inviting with invalid email format

### 9. Mobile Responsiveness (2 minutes)
**Test on mobile device:**
- Login and navigate dashboard
- Add package using mobile form
- Verify all buttons and forms work properly

### 10. Data Security (2 minutes)
**Negative Flow:**
- Try accessing another organization's data by manipulating URLs
- Logout and try accessing protected pages (should redirect to login)

---

## Quick Smoke Test (5 minutes total)
If time is limited, run this abbreviated test:

1. **Register/Login** (1 min)
2. **Add one package** (2 min)
3. **Mark package delivered** (1 min)
4. **Check dashboard counts** (1 min)

---

## Critical User Journeys to Validate

### New User Journey (First-time experience)
1. Land on homepage → Register → Organization setup → Add first package → Invite team member

### Daily Operations Journey (Typical daily use)
1. Login → Check pending pickups → Log new packages → Mark deliveries → Check dashboard

### Admin Journey (Organization management)
1. Login → Settings → Manage team → Review usage → Consider upgrade

---

## Success Criteria
- No browser console errors during normal usage
- All forms validate properly before submission
- Clear error messages for invalid inputs
- Fast page load times (< 3 seconds)
- Mobile interface usable without horizontal scrolling
- Data persists correctly between sessions
- Trial limits enforced appropriately
- Upgrade path is clear and functional