# UnivChicagoApp Release Notes

Release date: 2026-11-06

## Summary

This release adds the ability to resend dashboard user invitations and makes usernames case-insensitive at login.

## Highlights

- Added a **Resend Invite** button to the Inactive Users table on the Admin page. It appears for users with a pending invitation and sends a fresh invitation email.
- Usernames are no longer case sensitive when logging in (passwords remain case sensitive).

## User Impact

- Admins can send more than one invitation email per new user.
- Each resend issues a new link valid for 7 days; earlier links stop working.
- Users who type their username with different capitalization can now log in.

## Deployment Notes

- This frontend release requires the matching `UnivChicagoCloudCode` release dated 2026-11-06 (`resendDashboardUserInvite` and updated `listUsers`) to be deployed first.
