# Google Sheets Integration Setup

This guide will help you connect the landing page forms to Google Sheets.

## Option 1: Google Apps Script (Recommended - Easiest)

### Step 1: Create a Google Sheet
1. Create a new Google Sheet
2. Add headers in the first row: `Type`, `Email`, `Agent Name`, `Wallet Address`, `Wallet Name`, `Timestamp`
3. Share the sheet (or keep it private if you prefer)

### Step 2: Create Google Apps Script
1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete the default code and paste this:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Add a new row with the form data
    // Handles both email submissions and wallet connections
    sheet.appendRow([
      data.type || 'email',
      data.email || '', // Empty for wallet connections
      data.agentName || '', // Empty for wallet connections
      data.walletAddress || '', // Empty for email submissions
      data.walletName || '', // Empty for email submissions
      data.timestamp || new Date().toISOString()
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click **Save** (💾) and give your project a name
4. Click **Deploy** → **New deployment**
5. Select type: **Web app**
6. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
7. Click **Deploy**
8. Copy the **Web app URL** (this is your webhook URL)

### Step 3: Add to Environment Variables
1. Create a `.env.local` file in the root of your project
2. Add your Google Apps Script URL:

```
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

3. Restart your Next.js dev server

## Option 2: Using Google Sheets API (Advanced)

If you prefer using the Google Sheets API directly, you'll need to:
1. Set up a Google Cloud Project
2. Enable Google Sheets API
3. Create a service account
4. Share your Google Sheet with the service account email
5. Download the service account JSON key
6. Install `googleapis`: `npm install googleapis`
7. Update the API route to use the service account

## Testing

1. Submit a form on your landing page
2. Check your Google Sheet - you should see a new row with the data
3. Check the browser console for any errors

## Troubleshooting

- **403 Error**: Make sure your Google Apps Script deployment has "Anyone" access
- **No data in sheet**: Check that the sheet headers match the script
- **CORS errors**: Google Apps Script handles CORS automatically, but check your deployment settings

