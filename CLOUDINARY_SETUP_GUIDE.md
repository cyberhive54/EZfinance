# Cloudinary Setup Guide for EZfinance

## Overview
Cloudinary is a cloud service for managing images. We use it to store transaction attachments securely.

## Step-by-Step Setup

### 1. Create Cloudinary Account (if not already done)
- Visit: https://cloudinary.com/users/register/free
- Sign up with your email
- Verify your email

### 2. Get Your Cloud Name
1. Go to your Cloudinary Dashboard: https://console.cloudinary.com/console
2. Look at the top of the page - you'll see your **Cloud Name**
3. Copy this value → This is `VITE_CLOUDINARY_CLOUD_NAME`

Example: `djx9nq1v2`

### 3. Create an Upload Preset (MOST IMPORTANT for VITE_CLOUDINARY_UPLOAD_PRESET)

**Unsigned Upload Preset (Recommended for Frontend):**
1. Go to Dashboard → Settings (⚙️ icon)
2. Navigate to **Upload** tab
3. Scroll down to **Upload presets** section
4. Click **Add upload preset** button
5. Fill in:
   - **Preset name**: `ezfinance_transactions` (or any name you prefer)
   - **Unsigned**: Toggle ON (this allows frontend uploads without exposing API key)
   - **Folder**: `ezfinance/transactions` (optional, for organizing uploads)
6. Click **Save**
7. Copy the preset name → This is `VITE_CLOUDINARY_UPLOAD_PRESET`

### 4. Get Your API Key (Optional but Recommended)
1. Go to Dashboard → Settings (⚙️ icon)
2. Go to **API Keys** tab
3. Copy your **API Key** → This is `VITE_CLOUDINARY_API_KEY`

Note: Your **API Secret** should NEVER be exposed in frontend code - keep it on backend only.

### 5. Add to Environment Variables

In your project's environment variables (Vercel/local .env), add:

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=ezfinance_transactions
VITE_CLOUDINARY_API_KEY=your_api_key
```

Example:
```
VITE_CLOUDINARY_CLOUD_NAME=djx9nq1v2
VITE_CLOUDINARY_UPLOAD_PRESET=ezfinance_transactions
VITE_CLOUDINARY_API_KEY=123456789abcdef
```

## Will Everything Work After Adding These Keys?

**Short Answer: YES - with minor setup**

After adding the three environment variables, the image upload functionality should work. However:

### What Works Immediately:
✅ Image upload to Cloudinary
✅ Image preview before upload
✅ File validation (size, format)
✅ Storing attachment URLs in database
✅ Displaying attachments in transactions table

### What Still Needs Setup:
❌ **Database Migration** - You must still run the SQL migration to create:
  - `frequency` column in `transactions` table
  - `transaction_attachments` table
  - Associated RLS policies

Run this SQL in your Supabase dashboard:
```sql
-- Add frequency column
ALTER TABLE transactions ADD COLUMN frequency TEXT DEFAULT 'none';

-- Create attachments table
CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own attachments"
  ON transaction_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON transaction_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON transaction_attachments FOR DELETE
  USING (auth.uid() = user_id);
```

## Troubleshooting

### Images not uploading?
- Check that `VITE_CLOUDINARY_UPLOAD_PRESET` is set to your unsigned preset name
- Verify file is under 6MB
- Check console for CORS errors

### Getting 401/403 errors?
- Make sure upload preset is set to **Unsigned**
- Verify Cloud Name is correct

### File restrictions not working?
- The utility checks: `.jpg, .jpeg, .png, .webp` formats
- Max size: 6MB per image
- You can modify limits in `/src/utils/cloudinary.ts`

## Support
- Cloudinary docs: https://cloudinary.com/documentation
- v0 implementation in: `/src/utils/cloudinary.ts`
- Hook in: `/src/hooks/useTransactionAttachments.ts`
