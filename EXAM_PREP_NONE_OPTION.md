# Exam Prep "None" Option Added

## Date: November 12, 2025

## Change Summary

Added "None" as a selectable option for exam preparation during onboarding, allowing users to explicitly indicate they are not preparing for any exam.

---

## Changes Made

### 1. Added "None" to EXAM_PREPS Array ✅

**File**: `app/(auth)/onboarding.tsx`

**Before:**
```typescript
const EXAM_PREPS = [
  { value: 'gre', label: 'GRE', emoji: '📚' },
  { value: 'sat', label: 'SAT', emoji: '✏️' },
  { value: 'toefl', label: 'TOEFL', emoji: '🌍' },
  { value: 'ielts', label: 'IELTS', emoji: '🎯' },
  { value: 'act', label: 'ACT', emoji: '📖' },
];
```

**After:**
```typescript
const EXAM_PREPS = [
  { value: 'none', label: 'None', emoji: '🚫' },  // ✅ ADDED
  { value: 'gre', label: 'GRE', emoji: '📚' },
  { value: 'sat', label: 'SAT', emoji: '✏️' },
  { value: 'toefl', label: 'TOEFL', emoji: '🌍' },
  { value: 'ielts', label: 'IELTS', emoji: '🎯' },
  { value: 'act', label: 'ACT', emoji: '📖' },
];
```

---

### 2. Updated Logic to Not Send "None" to Backend ✅

**File**: `app/(auth)/onboarding.tsx`

**Before:**
```typescript
// Add examPrep if provided
if (examPrep) {
  profileData.examPrep = examPrep;
}
```

**After:**
```typescript
// Add examPrep if provided (and not "none")
if (examPrep && examPrep !== 'none') {
  profileData.examPrep = examPrep;
}
```

**Why:** When user selects "None", we don't need to store any exam prep value in the database.

---

### 3. Updated UI Text ✅

**File**: `app/(auth)/onboarding.tsx`

**Before:**
```typescript
<Text style={styles.subtitle}>Optional: We can tailor words for your test</Text>
```

**After:**
```typescript
<Text style={styles.subtitle}>We can tailor words for your test, or choose None</Text>
```

**Why:** Makes it clear that "None" is a valid option, not just skipping.

---

## User Experience

### Before
- Users had to click "Skip" button if not preparing for an exam
- No explicit "None" choice
- "Get Started" button was disabled until an exam was selected or skip was clicked

### After
- Users can explicitly select "None" 🚫
- "None" appears as the first option (most common choice)
- More intuitive - user makes an active choice
- "Get Started" button is enabled when "None" is selected

---

## UI Flow

### Step 3: Exam Prep

```
┌─────────────────────────────────────────┐
│  Preparing for an exam?                 │
│  We can tailor words for your test,     │
│  or choose None                          │
├─────────────────────────────────────────┤
│                                          │
│  🚫  None                 ✅ SELECTED   │
│  📚  GRE                                 │
│  ✏️  SAT                                 │
│  🌍  TOEFL                               │
│  🎯  IELTS                               │
│  📖  ACT                                 │
│                                          │
├─────────────────────────────────────────┤
│  [Skip]         [Get Started] ✅ ENABLED│
└─────────────────────────────────────────┘
```

---

## Data Flow

### When "None" is Selected

```
User selects "None"
  ↓
examPrep state = 'none'
  ↓
User clicks "Get Started"
  ↓
handleComplete() is called
  ↓
profileData is created with ageGroup, context, etc.
  ↓
Check: if (examPrep && examPrep !== 'none')
  ↓ FALSE (examPrep is 'none')
  ↓
examPrep is NOT added to profileData
  ↓
Profile saved WITHOUT examPrep field
  ↓
Backend creates profile with no exam prep
```

### When Exam is Selected

```
User selects "GRE"
  ↓
examPrep state = 'gre'
  ↓
User clicks "Get Started"
  ↓
handleComplete() is called
  ↓
profileData is created
  ↓
Check: if (examPrep && examPrep !== 'none')
  ↓ TRUE
  ↓
profileData.examPrep = 'gre'
  ↓
Profile saved WITH examPrep: 'gre'
  ↓
Backend can tailor words for GRE
```

---

## Benefits

✅ **Clearer UX** - Users actively choose "None" instead of skipping  
✅ **Better data** - Explicit choice captured vs. absence of data  
✅ **Intuitive** - "None" is the first option (most common)  
✅ **Consistent** - Same pattern as age group and context steps  
✅ **Flexible** - User can still click "Skip" if they want  

---

## Backend Compatibility

### Database Schema

The `examPrep` field in DynamoDB Users table remains:
- **Optional field** (not required)
- **String type**
- **Valid values**: `'gre'`, `'sat'`, `'toefl'`, `'ielts'`, `'act'`
- **Omitted** when user selects "None"

### Lambda Function

No changes needed in `user-preferences` Lambda:
- Already handles optional `examPrep` field
- `'none'` value is never sent to backend
- Field is simply omitted from profile data

---

## Testing

### Test Cases

1. **Select "None"**
   - ✅ "None" option should be highlighted
   - ✅ "Get Started" button should be enabled
   - ✅ Profile should be saved without `examPrep` field

2. **Select an exam (e.g., "GRE")**
   - ✅ "GRE" option should be highlighted
   - ✅ "Get Started" button should be enabled
   - ✅ Profile should be saved with `examPrep: 'gre'`

3. **Click "Skip"**
   - ✅ Should proceed without selecting any option
   - ✅ Profile should be saved without `examPrep` field

4. **Switch between options**
   - ✅ Should be able to select "None" then change to "GRE"
   - ✅ Last selected option should be used

---

## Deployment

### Files Changed

- ✅ `app/(auth)/onboarding.tsx` - Added "None" option and logic

### Deployment Required

```powershell
# Deploy web app
.\scripts\deploy.ps1 -Action web
```

**OR** (if also deploying backend changes):

```powershell
# Quick deploy (Lambda + Web)
.\scripts\deploy.ps1 -Action quick
```

---

## Visual

### Options Display

```
🚫 None      ← NEW! Explicitly choose no exam prep
📚 GRE       ← Existing options
✏️ SAT
🌍 TOEFL
🎯 IELTS
📖 ACT
```

---

## Status

✅ **Code updated**: Complete  
✅ **Linting**: No errors  
✅ **Logic**: "None" doesn't save to backend  
✅ **UI text**: Updated to mention "None" option  
📋 **Deployment**: Pending  
📋 **Testing**: Pending  

---

## Next Steps

1. **Deploy changes:**
   ```powershell
   .\scripts\deploy.ps1 -Action web
   ```

2. **Clear browser cache** (Ctrl + Shift + R)

3. **Test onboarding:**
   - Sign up with new email
   - Complete steps 1-2
   - On step 3, select "None"
   - Click "Get Started"
   - Verify profile is created

4. **Verify in DynamoDB:**
   - User profile should NOT have `examPrep` field when "None" is selected
   - User profile SHOULD have `examPrep` field when exam is selected

---

**Ready to deploy!** ✅

