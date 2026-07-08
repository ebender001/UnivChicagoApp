# BeFitMe End-User Guide

This guide explains how to use the BeFitMe website for everyday tasks such as logging in, managing specialties, institutions, and users, and exporting data.

## 1. Logging in

1. Open the BeFitMe website in your browser.
2. In the top-right corner of the page, click the Login button.
3. Enter your username or email address and password.
4. Click Log in.
5. If you are logged in successfully, the header button changes to Log Out.

Tips:
- Use the same credentials that were provided to you by your administrator.
- If your session is inactive for a while, you may be logged out automatically and prompted to sign in again.
- If you do not see the pages you expect after logging in, you may not have permission for that section.

## 2. Navigating the dashboard

After logging in, the dashboard provides access to:
- Surveys
- Enrollees
- Data Export
- Admin

Use the dashboard buttons to open the section you need.

## 3. Managing specialties

Specialties are managed from the Admin page.

### View specialties
1. Go to Admin.
2. Open the Specialties section.
3. The list of active specialties appears in the table.

### Add a specialty
1. Open the Specialties section in Admin.
2. Enter the specialty name in the Specialty Name field.
3. Click Add Specialty.
4. The new specialty appears in the list if the action succeeds.

### Delete a specialty
1. Open the Specialties section in Admin.
2. In the table, click the delete icon next to the specialty you want to remove.
3. Confirm the prompt.

Note:
- Deleting a specialty is a soft delete in the current system. The specialty is deactivated rather than permanently removed.
- Only users with the super_admin role can add or delete specialties.

## 4. Managing institutions

Institutions are managed from the Admin page.

### View institutions
1. Go to Admin.
2. Open the Institutions section.
3. The list of active institutions appears in the table.

### Add an institution
1. Open the Institutions section in Admin.
2. Enter the institution name in the Institution Name field.
3. Click Add Institution.
4. The new institution appears in the list if the action succeeds.

### Delete an institution
1. Open the Institutions section in Admin.
2. In the table, click the delete icon next to the institution you want to remove.
3. Confirm the prompt.

Note:
- Deleting an institution is a soft delete in the current system. The institution is deactivated rather than permanently removed.
- Only users with the super_admin role can add or delete institutions.

## 5. Managing users

User management is available from the Admin page.

### Invite a new user
1. Go to Admin.
2. Open the Invite New User section.
3. Enter the user email, name, role, institution, and specialty.
4. Click Send Invite.
5. The system sends an invitation for the new dashboard user.

### View users
1. Go to Admin.
2. Open the Users section.
3. Active users appear in the Active Users table.
4. Inactive users appear in the Inactive Users table.

### Delete a user
1. Go to Admin.
2. Open the Users section.
3. In the Active Users table, click the delete icon next to the user you want to remove.
4. Confirm the prompt.

Note:
- Deleting a user is a soft delete in the current system. The user is deactivated rather than permanently removed.
- You cannot delete your own account.
- Only users with the super_admin role can manage users.

## 6. Exporting data

Data exports are available from the Data Export page.

### Open the Data Export page
1. From the dashboard, click Data Export.

### Choose a file format
- Select CSV for spreadsheet-friendly files.
- Select JSON for structured data exports.

### Download survey data
1. Click Survey Data.
2. The export downloads automatically to your browser downloads folder.

### Download frailty scores
1. Click Frailty Scores.
2. The export downloads automatically.

### Download activity data
1. Click Activity Data.
2. Choose one of the available export options:
   - One Activity File
   - HR, Pedometer, and Exercise ZIP
   - Heart Rate Only
   - Pedometer Only
   - Exercise Only
   - Activity by Watch Number
   - Activity by Date
3. If you choose Activity by Watch Number, select the watch number and confirm.
4. If you choose Activity by Date, select a start and end date and confirm.
5. The export downloads automatically.

## 7. Logging out

1. Click the Log Out button in the top-right corner of the page.
2. Confirm the logout prompt if prompted.
3. You return to the logged-out state.

## 8. Common issues

- If the Admin page does not show the management sections, your account may not have super_admin permissions.
- If a form does not save, check that all required fields are completed.
- If an export does not download, make sure your browser allows downloads and that you are still logged in.
- If you are timed out because of inactivity, sign in again to continue.
