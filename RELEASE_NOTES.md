# Beats TV v2.1.9 (Verified)

## 🚀 Enhancements

- **UI Spacing Fix**: Resolved the 90px gap between the sidebar and content list by correcting flex layout margins. Verified 90px alignment with Playwright.
- **Redundant Chips Removed**: Eliminated "Live TV", "Movies", and "Series" chips from the top bar (redundant with sidebar switches).
- **Category Filtering Fix**: Improved backend SQL query to strictly honor hidden group settings during search. No "orphan" channels from hidden groups.
- **Library Editor UX**: Added backdrop dismissal (exit by tapping outside) and ensured the channel list automatically refreshes when changes are made.
- **Resilient Styling**: Fixed production CSS loading by relaxing CSP and disabling inlineCritical styles.

## 🛠 Previous Fixes (v2.1.7-v2.1.8)

- Dynamic glassmorphism scaling.
- Fixed logo bleeding in sidebar.
- Added modern "Ascension" design accents.
