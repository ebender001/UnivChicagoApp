# UnivChicagoApp Release Notes

Release date: 2026-06-13

## Summary

This release strengthens dashboard authentication handling, expands admin and export workflows, and improves day-to-day navigation across the BeFitMe web app.

## Highlights

- Added graceful handling for expired Back4App session tokens during authenticated CloudCode calls. The app now clears stored auth state, stops inactivity timers, closes session overlays, and shows a re-login message instead of attempting an automatic fresh login.
- Added a forgot-password flow directly in the login overlay so dashboard users can request a reset without leaving the app.
- Tightened dashboard access rules so login and role restrictions are enforced more consistently, including limiting survey-start actions for viewer users.
- Added shared connectivity status feedback in the site header to surface online, poor connection, and offline states.

## Registration And Survey Workflow

- Added manual gait speed entry support to enrollee registration.
- Updated survey and enrollee listings to include enrollee numbers more consistently.
- Added breadcrumb navigation across dashboard pages to make multi-step navigation clearer.

## Admin And Data Export

- Added dashboard controls for managed seed data, then removed the seed-managed-data dashboard section as the workflow evolved.
- Expanded data export UX with activity export filters, overlays, and related copy updates.
- Simplified My Info PIN generation messaging and flow.

## User Impact

- Expired sessions now fail in a predictable way that page code can handle cleanly.
- Dashboard users have a clearer recovery path when they forget a password.
- Export, enrollee, and survey pages provide better navigation and clearer operational feedback.

## Deployment Notes

- This frontend release is intended to ship alongside the matching `UnivChicagoCloudCode` release dated 2026-06-13.
- Session-expiration handling depends on existing Parse error responses and does not require automatic reauthentication support.
