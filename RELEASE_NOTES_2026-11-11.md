# UnivChicagoApp Release Notes

Release date: 2026-11-11

## Summary

This release updates the dashboard and enrollee workflow wording and layout, simplifies grip and gait entry, and adds a site favicon.

## Highlights

- Dashboard title is now "Frailty Screening Dashboard", and "Register New Patient" is now "Start a New Grip and Gait".
- Dashboard cards are now: Survey Completed, Gait and Grip Completed, and Survey and Gait and Grip Completed (new page, `frailty-screenings.html`).
- Gait and Grip Completed lists records with no survey; Survey and Gait and Grip Completed lists records with a linked survey.
- The Surveys page section is now "Surveys Needing Grip and Gait", and the All Surveys table shows a Gait and Grip status instead of an enrollee number.
- Removed the randomly generated enrollee number and the start and stop dates from the registration form. Lists now show a single Date and Time Completed column.
- Grip and gait tests now default to "Yes" on the registration form.
- Added the BeFitMe app icon as the site favicon.

## Deployment Notes

- Requires the matching `UnivChicagoCloudCode` release dated 2026-11-11 (`listEnrollees` `surveyLinked` filter; `saveEnrollee` no longer requires an enrollee number). Deploy CloudCode first.
