# Attachment Upload Debugging Guide

## Overview
Comprehensive logging has been added to track attachment uploads, saves, edits, deletes, and updates throughout the entire process.

---

## Console Debug Logs Reference

### 1. Upload Phase - Cloudinary

#### Start Upload
```
[v0] ATTACHMENT UPLOAD: Starting upload process
  fileName: "photo.jpg"
  fileType: "image/jpeg"
  fileSize: "2.50MB"
  timestamp: "2026-02-01T10:30:00.000Z"
```

#### Environment Check
```
[v0] ATTACHMENT: Environment variables check
  cloudNameExists: true
  uploadPresetExists: true
  cloudName: "ezfin***"
  uploadPreset: "ezfin***"
```

#### Upload Request
```
[v0] ATTACHMENT: Sending upload request to Cloudinary
  uploadUrl: "https://api.cloudinary.com/v1_1/ezfinance/image/upload"
```

#### Response Received
```
[v0] ATTACHMENT: Cloudinary response received
  status: 200
  statusText: "OK"
  headers: { ... }
```

#### Success
```
[v0] ATTACHMENT: Upload successful
  publicId: "ezfinance/transactions/abc123def"
  url: "https://res.cloudinary.com/ezf***"
  fileSize: "2.50MB"
```

#### Error Cases
```
[v0] ATTACHMENT ERROR: Invalid file type
  receivedType: "application/pdf"
  allowedTypes: ["image/jpeg", "image/png", "image/webp"]
```

```
[v0] ATTACHMENT ERROR: File size exceeds limit
  fileSize: "7.50MB"
  maxSize: "6.00MB"
```

```
[v0] ATTACHMENT ERROR: Missing Cloudinary configuration
  VITE_CLOUDINARY_CLOUD_NAME: undefined
  VITE_CLOUDINARY_UPLOAD_PRESET: undefined
```

---

### 2. Save Phase - Supabase Database

#### Start Save
```
[v0] ATTACHMENT SAVE: Starting attachment save to Supabase
  transactionId: "trans_123456"
  userId: "user_789"
  publicId: "ezfinance/transact***"
  fileName: "photo.jpg"
  fileSize: "2.50MB"
  timestamp: "2026-02-01T10:30:05.000Z"
```

#### Insert Payload
```
[v0] ATTACHMENT SAVE: Insert payload
  keys: ["transaction_id", "user_id", "cloudinary_public_id", "cloudinary_url", "original_filename", "file_size"]
  transactionId: "trans_123456"
```

#### Success
```
[v0] ATTACHMENT SAVE: Successfully saved
  attachmentId: "attach_456789"
  transactionId: "trans_123456"
```

#### Callback
```
[v0] ATTACHMENT SAVE: Success callback triggered
```

#### Error Cases
```
[v0] ATTACHMENT SAVE ERROR: Supabase insert failed
  code: "23502"
  message: "Failing row contains (null, trans_123456, ...)."
  details: "Failing row contains (null, trans_123456, ...). Key (user_id)=(null) is not present in table \"auth.users\"."
  hint: "null"
```

#### Mutation Error
```
[v0] ATTACHMENT SAVE: Mutation error
  error: "Failed to add attachment: Key violation"
```

---

### 3. Delete Phase

#### Start Delete
```
[v0] ATTACHMENT DELETE: Starting deletion
  attachmentId: "attach_456789"
  transactionId: "trans_123456"
  timestamp: "2026-02-01T10:31:00.000Z"
```

#### Success
```
[v0] ATTACHMENT DELETE: Successfully deleted
  attachmentId: "attach_456789"
```

#### Callback
```
[v0] ATTACHMENT DELETE: Success callback triggered
```

#### Error Cases
```
[v0] ATTACHMENT DELETE ERROR: Supabase delete failed
  code: "PGRST116"
  message: "The result contains 0 rows"
  details: null
  attachmentId: "attach_456789"
```

---

### 4. Form Submission Phase

#### Start Submission
```
[v0] FORM SUBMIT: Starting transaction form submission
  hasAttachments: true
  attachmentCount: 2
  isEditing: false
  timestamp: "2026-02-01T10:32:00.000Z"
```

#### Create Transaction
```
[v0] FORM SUBMIT: Creating new transaction
[v0] FORM SUBMIT: New transaction created
  transactionId: "trans_123456"
```

#### Update Transaction
```
[v0] FORM SUBMIT: Updating existing transaction
  transactionId: "trans_existing"
```

#### Attachment Processing
```
[v0] FORM SUBMIT: Starting attachment uploads
  count: 2
  transactionId: "trans_123456"

[v0] FORM SUBMIT: Uploading file to Cloudinary
  fileName: "photo1.jpg"
  fileSize: "2.50MB"

[v0] FORM SUBMIT: File uploaded to Cloudinary, saving to database
  publicId: "ezfinance/transactions/abc123def"

[v0] FORM SUBMIT: Attachment saved successfully
  fileName: "photo1.jpg"

[v0] FORM SUBMIT: All attachments processed
```

#### Error During Processing
```
[v0] FORM SUBMIT ERROR: Attachment processing failed
  fileName: "photo2.jpg"
  error: "File size exceeds 6MB limit"

[v0] FORM SUBMIT ERROR: Transaction submission failed
  error: "Connection timeout"
  stack: "Error: Connection timeout\n    at fetch:45..."
```

---

## How to Debug Issues

### Issue: "Cloudinary configuration is missing"

**Check These:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify these keys exist:
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
3. In console, look for:
   ```
   [v0] ATTACHMENT: Environment variables check
   ```
   - If `cloudNameExists: false` → variable not set
   - If `uploadPresetExists: false` → preset not set

### Issue: "Upload failed" Error

**Check These:**
1. Look for `[v0] ATTACHMENT: Cloudinary response received`
   - If `status: 401` → Upload preset is invalid/inactive
   - If `status: 400` → Invalid preset or configuration
   - If `status: 413` → File too large
2. Verify preset is set to "Unsigned" in Cloudinary dashboard
3. Check if preset is rate-limited

### Issue: "Failed to add attachment" Database Error

**Check These:**
1. Look for `[v0] ATTACHMENT SAVE ERROR`
   - Code `23502` → Missing required field (likely user_id)
   - Code `23505` → Duplicate entry
   - Code `23503` → Foreign key violation (transaction_id not found)
2. Check that transaction was created before attachment upload
3. Verify Supabase RLS policies allow insert on `transaction_attachments`

### Issue: File Uploaded But Not Saved

**Check These:**
1. File appears in Cloudinary dashboard?
   - Yes → Database save issue
   - No → Cloudinary upload failed
2. Look for `[v0] FORM SUBMIT: File uploaded to Cloudinary, saving to database`
   - If this log appears but attachment isn't saved → Database issue
   - If this log doesn't appear → Cloudinary issue

### Issue: Delete Not Working

**Check These:**
1. Look for `[v0] ATTACHMENT DELETE ERROR`
   - Code `PGRST116` → Attachment ID not found
2. Verify attachment ID exists before delete
3. Check Supabase RLS policy allows delete

---

## Verifying Setup

### Step 1: Check Console Logs
```javascript
// Run this in browser console to see all v0 logs
console.log("Checking for v0 logs...");
// Add transaction and upload attachment
// Look for [v0] logs appearing in real-time
```

### Step 2: Check Cloudinary Dashboard
1. Go to cloudinary.com → Dashboard
2. Click Media Library
3. Look for folder: `ezfinance/transactions`
4. Your uploaded images should appear there

### Step 3: Check Supabase Database
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT id, transaction_id, cloudinary_public_id, cloudinary_url, created_at 
FROM transaction_attachments 
ORDER BY created_at DESC 
LIMIT 10;
```
3. Your attachments should appear in the results

### Step 4: Network Tab Check
1. Open DevTools → Network tab
2. Filter for "cloudinary"
3. Upload a file
4. Look for POST request to `api.cloudinary.com/v1_1/.../image/upload`
5. Response should be 200 OK with public_id in response

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `23502` | Not null violation | Missing user_id - Check transaction created first |
| `23503` | Foreign key violation | Transaction doesn't exist - Create transaction first |
| `23505` | Unique violation | Attachment already exists - Check for duplicates |
| `PGRST116` | Result contains 0 rows | Item to delete not found - Verify ID exists |
| `401` | Unauthorized | Invalid Cloudinary preset - Check preset configuration |
| `413` | Payload too large | File exceeds 6MB - Check file size |
| `timeout` | Request timeout | Network issue - Retry or check connection |

---

## Testing Flow

1. **Upload Photo**
   - Watch for `[v0] ATTACHMENT UPLOAD: Starting upload process`
   - Should see `[v0] ATTACHMENT: Upload successful`

2. **Save to Database**
   - Should see `[v0] ATTACHMENT SAVE: Starting attachment save to Supabase`
   - Should see `[v0] ATTACHMENT SAVE: Successfully saved`

3. **Verify in UI**
   - Photo appears in transaction attachments
   - Shows attachment count

4. **Delete Photo**
   - Should see `[v0] ATTACHMENT DELETE: Starting deletion`
   - Should see `[v0] ATTACHMENT DELETE: Successfully deleted`

5. **Verify Deleted**
   - Photo disappears from transaction
   - Supabase query shows attachment is gone

---

## Performance Tips

- Upload time: ~1-2 seconds per image (depends on connection)
- Cloudinary compression: Automatic on upload
- Database save: ~100-300ms
- Multiple attachments: Sequential processing (one by one)

---

## Next Steps

If issues persist:
1. Check Vercel logs: Vercel Dashboard → Project → Deployments → Logs
2. Check Supabase logs: Supabase Dashboard → Logs
3. Check Cloudinary logs: cloudinary.com → Dashboard → Events
