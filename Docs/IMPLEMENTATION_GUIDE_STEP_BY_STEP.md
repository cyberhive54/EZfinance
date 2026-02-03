# EZFinance - File Upload Features Implementation Guide

This guide covers three critical fixes and implementations:
1. **Fix Issue #1**: Transaction Attachment URL not saving to Supabase
2. **Feature #2**: Add Profile Photo Upload functionality
3. **Feature #3**: Add inline file validation (type + size)

---

## ✅ COMPLETED IN CODE

The following changes have already been implemented:

### 1. Transaction Attachment Fix ✓
- **File**: `/src/pages/Transactions.tsx` (lines 484-496)
- **Fixed**: Missing `user_id` when saving attachments to database
- **Fixed**: Incorrect field mapping - was sending `original_filename` instead of `file_name`
- **Added**: `file_type` field to track MIME type
- **Issue**: Transaction attachments now properly include user_id and correct field names for Supabase table schema

### 2. File Validation in Transactions ✓
- **File**: `/src/pages/Transactions.tsx` (lines 677-715)
- **Added**: Inline validation for file type and size
- **Checks**:
  - File type: Only allows JPEG, PNG, WebP (`image/jpeg`, `image/png`, `image/webp`)
  - File size: Maximum 6MB per file
- **UX**: Shows alert with specific error for each invalid file
- **Logging**: Comprehensive debug logging for troubleshooting

### 3. Cloudinary Utility Enhancement ✓
- **File**: `/src/utils/cloudinary.ts`
- **Added**: New `validateImageFile()` function for reusable validation
- **Exports**: 
  - `ALLOWED_IMAGE_FORMATS` constant
  - `ALLOWED_IMAGE_EXTENSIONS` constant
  - `MAX_FILE_SIZE` constant
  - `validateImageFile()` function
- **Benefit**: Reusable validation for profile photos

### 4. Profile Photo Feature - Core Implementation ✓
- **Created**: `/src/utils/profilePhoto.ts`
  - Upload function with validation
  - Delete function for cleanup
  - Cloudinary integration for profile folder
  - 3MB size limit for profile photos
  
- **Created**: `/src/hooks/useProfilePhoto.ts`
  - Query for fetching profile photo
  - Upload mutation with Supabase sync
  - Delete mutation
  - Error handling and toast notifications
  
- **Created**: `/src/components/profile/ProfilePhotoUpload.tsx`
  - Interactive photo upload component
  - Camera icon overlay
  - Delete button
  - Client-side validation
  - Loading states
  
- **Updated**: `/src/components/settings/ProfileSection.tsx`
  - Integrated ProfilePhotoUpload component
  - Removed old placeholder photo UI
  
- **Updated**: `/src/types/database.ts`
  - Added `profile_photo_url` field
  - Added `profile_photo_cloudinary_public_id` field

---

## 🔧 MANUAL SQL SETUP REQUIRED

You need to run the following SQL migration in your Supabase dashboard:

### Migration File: `/supabase/migrations/20260201_add_profile_photo.sql`

\`\`\`sql
-- Add profile photo columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN profile_photo_url TEXT DEFAULT NULL,
ADD COLUMN profile_photo_cloudinary_public_id TEXT DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.profiles.profile_photo_url IS 'Cloudinary URL for user profile photo';
COMMENT ON COLUMN public.profiles.profile_photo_cloudinary_public_id IS 'Cloudinary public ID for deletion purposes';

-- Create index for user lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
\`\`\`

### Steps to Run the SQL:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **SQL Editor** in the left sidebar

2. **Create New Query**
   - Click **New Query**
   - Paste the SQL from `/supabase/migrations/20260201_add_profile_photo.sql`
   - Click **Run**

3. **Verify the Changes**
   - Go to **Table Editor**
   - Select **profiles** table
   - Verify two new columns appear:
     - `profile_photo_url` (TEXT, nullable)
     - `profile_photo_cloudinary_public_id` (TEXT, nullable)

---

## 📋 TRANSACTION ATTACHMENT TABLE SCHEMA

The transaction_attachments table should already exist with this structure:

\`\`\`sql
CREATE TABLE public.transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
\`\`\`

**Key Fields** (now being correctly populated):
- `user_id`: User who uploaded the attachment ✓ (FIXED)
- `file_name`: Original filename ✓ (FIXED - was `original_filename`)
- `file_type`: MIME type of file ✓ (FIXED - added)
- `cloudinary_url`: URL from Cloudinary ✓
- `cloudinary_public_id`: Public ID from Cloudinary ✓

---

## 🧪 TESTING CHECKLIST

### Test Transaction Attachments:
- [ ] Go to Transactions page
- [ ] Click "Add Transaction"
- [ ] Attach an image file (JPG/PNG/WebP, under 6MB)
- [ ] Submit the transaction
- [ ] Check Supabase → transaction_attachments table
  - [ ] Row created with transaction_id
  - [ ] Row has user_id (THIS WAS THE BUG - should now be fixed)
  - [ ] Row has correct file_name
  - [ ] Row has file_type (e.g., "image/jpeg")
  - [ ] Row has cloudinary_url
- [ ] Verify in Transactions UI that attachment count shows
- [ ] Test invalid file:
  - [ ] Try uploading a PDF → should show error
  - [ ] Try uploading a 10MB image → should show error

### Test Profile Photo Upload:
- [ ] Go to Settings → Profile Information
- [ ] Click the camera icon on profile photo area
- [ ] Upload a profile photo (JPG/PNG/WebP, under 3MB)
- [ ] Verify photo displays in the circular avatar
- [ ] Check Supabase → profiles table
  - [ ] `profile_photo_url` has the Cloudinary URL
  - [ ] `profile_photo_cloudinary_public_id` has the public ID
- [ ] Click "Remove Photo" button
- [ ] Verify photo is removed and fields cleared in Supabase
- [ ] Test invalid profile photo:
  - [ ] Try uploading 5MB image → should show error (3MB limit)
  - [ ] Try uploading PDF → should show error

### Test File Validation:
- [ ] Transaction attachments:
  - [ ] Try .pdf file → "Invalid file type" alert
  - [ ] Try .txt file → "Invalid file type" alert
  - [ ] Try 10MB image → "Exceeds 6MB limit" alert
  - [ ] Valid file accepted ✓
- [ ] Profile photo:
  - [ ] Try 4MB image → "Exceeds 3MB limit" alert
  - [ ] Valid file accepted ✓

---

## 🐛 DEBUGGING WITH CONSOLE LOGS

Check browser console for these debug logs:

### Transaction Attachments:
\`\`\`
[v0] FORM SUBMIT: Starting attachment uploads
[v0] FORM SUBMIT: Uploading file to Cloudinary
[v0] FORM SUBMIT: File uploaded to Cloudinary, saving to database
[v0] FORM SUBMIT: Attachment saved successfully
[v0] ATTACHMENT SAVE: Insert payload (shows field names)
\`\`\`

### Profile Photos:
\`\`\`
[v0] PROFILE PHOTO COMPONENT: File selected
[v0] PROFILE PHOTO UPLOAD: Starting upload
[v0] PROFILE PHOTO UPLOAD: Success
[v0] PROFILE PHOTO UPLOAD MUTATION: Starting
[v0] PROFILE PHOTO UPLOAD MUTATION: Saved to Cloudinary, updating database
[v0] PROFILE PHOTO UPLOAD MUTATION: Complete
\`\`\`

### File Validation:
\`\`\`
[v0] FILE VALIDATION: Invalid file type
[v0] FILE VALIDATION: File size exceeds limit
[v0] PROFILE PHOTO COMPONENT: File selected
\`\`\`

---

## 📦 CLOUDINARY FOLDER STRUCTURE

Images are now organized in Cloudinary:

\`\`\`
ezfinance/
├── transactions/
│   └── [attachment images for transactions]
└── profile/
    └── [profile photo images]
\`\`\`

---

## 🚀 DEPLOYMENT CHECKLIST

Before pushing to production:

1. **Run SQL Migration**
   - [ ] Execute the profile photo migration in Supabase
   - [ ] Verify columns added to profiles table

2. **Environment Variables**
   - [ ] Verify `VITE_CLOUDINARY_CLOUD_NAME` is set
   - [ ] Verify `VITE_CLOUDINARY_UPLOAD_PRESET` is set
   - [ ] Both should be in Vercel project variables

3. **Test Live Deployment**
   - [ ] Push code changes to GitHub
   - [ ] Vercel auto-deploys
   - [ ] Test transaction attachments work
   - [ ] Test profile photo upload works
   - [ ] Check console for errors

4. **Database Backup** (optional)
   - [ ] Consider backing up profiles table before deployment

---

## 🔍 COMMON ISSUES & FIXES

### Issue: "Cannot read property 'user' of undefined" when uploading profile photo
**Cause**: `supabase.auth.getUser()` not awaited in transaction upload code
**Status**: ✓ FIXED in code

### Issue: Transaction attachment has undefined user_id in database
**Cause**: Missing `user_id` when inserting to transaction_attachments table
**Status**: ✓ FIXED - now includes `user_id: currentUser.user.id`

### Issue: Fields don't match database schema
**Cause**: Sending `original_filename` instead of `file_name`
**Status**: ✓ FIXED - now sends correct field names

### Issue: Profile photo columns don't exist
**Solution**: Run the SQL migration (see section above)

### Issue: File validation not working
**Status**: ✓ IMPLEMENTED - inline validation added to:
- Transaction attachment input (lines 677-715)
- Profile photo component (built-in validation)

---

## 📝 FILE CHANGES SUMMARY

### Modified Files:
- ✓ `/src/pages/Transactions.tsx` - Fixed attachment upload, added validation
- ✓ `/src/utils/cloudinary.ts` - Enhanced validation utilities
- ✓ `/src/components/settings/ProfileSection.tsx` - Integrated photo upload
- ✓ `/src/types/database.ts` - Added profile photo fields

### New Files Created:
- ✓ `/src/utils/profilePhoto.ts` - Profile photo upload utility
- ✓ `/src/hooks/useProfilePhoto.ts` - Profile photo React query hook
- ✓ `/src/components/profile/ProfilePhotoUpload.tsx` - Profile photo component
- ✓ `/supabase/migrations/20260201_add_profile_photo.sql` - Database migration

---

## ✨ Summary of Fixes

| Issue | Root Cause | Fix | Status |
|-------|-----------|-----|--------|
| Attachment URL not in DB | Missing `user_id` in insert | Added user auth and user_id field | ✓ DONE |
| Wrong field names | Code used `original_filename` instead of `file_name` | Fixed field mapping | ✓ DONE |
| No file type validation | Validation only in Cloudinary util | Added inline validation in UI | ✓ DONE |
| No profile photo feature | Feature didn't exist | Built complete profile photo system | ✓ DONE |
| Profile photo size limit | No limit on profile photos | Added 3MB limit for profile photos | ✓ DONE |

---

## 🎯 Next Steps

1. **Run the SQL migration** (20260201_add_profile_photo.sql) in Supabase
2. **Commit and push** these code changes to your GitHub repo
3. **Verify on live deployment** that:
   - Transaction attachments now save with user_id
   - Profile photos can be uploaded
   - File validation works for both features
   - Attachments appear in the Transactions table

---

**Questions or Issues?** Check the console logs for `[v0]` prefixed messages for detailed debugging information.
