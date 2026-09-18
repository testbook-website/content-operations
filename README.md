# Content Team Executive Dashboard (Q4 2026)

A modern, high-performance executive dashboard built for the Content Operations Team. Features a comprehensive **Q4 2026 Content Roster** (with Night Updates and non-consecutive task assignments), a multi-tab **Productivity Tracker** synced live from Google Sheets every 5 minutes, and a **Category Wise Date** analytics portal.

Protected by 4-digit passcode: **`7730`**.

---

## Key Features

### 1. Security Gate
- **Passcode Protection**: Requires PIN **`7730`** to access the dashboard.
- Interactive virtual keypad + physical keyboard support.
- Session persistence in `sessionStorage` with instant re-lock button.

### 2. Q4 2026 Content Roster (1st October – 31st December 2026)
- **Visual Matrix Interface**:
  - Beautiful multi-week matrix view with custom pastel task badges:
    - `Child Pages` (mint badge)
    - `High Intent` (lavender badge)
    - `SEO Optimization` (rose badge)
    - `Event Pages (News week)` (peach badge)
    - `🌙 Night Update` (yellow card with 1.5px solid dark border, crescent moon, and stacked text)
  - Sticky `Writer` column with horizontal scrolling across all 13 weeks.
  - Separate structured sections for **Team A**, **Team B**, and **Upcoming Drafts & News Support**.
- **Night Updates Duty (Monday – Saturday Only | Sunday OFF)**:
  - Daily night shifts rotate Monday to Saturday across active News team members.
  - **Sunday is deleted**: No one works on Sunday.
  - Top Night Schedule card displays the 6 daily slots for the selected week with designated **Night Lead** badges.
- **Weekly Rotation & Non-Consecutive Guarantee**:
  - **Team A**: Sonika, Archita, Shemaila, Somya, Atul.
  - **Team B**: Nadeem, Shilpa Kohli, Aditi, Mohit, Trishala (*Trishala replaces Shilpa Singh*).
  - Teams alternate weekly between News ("Event Pages") and Content operations.
  - **Zero Repeat Guarantee**: No writer receives the same content task on consecutive content weeks.
- **Upcoming Drafts**: Archana alternates weekly between Upcoming Drafts and News duty.
- **Filtering & Export**: Filter by team (Team A / Team B), search by writer, and instant CSV export.
- **Directory**: Subject matter category mentors and Prep Team domain leads.

### 3. Productivity Portal (Synced Live from Google Sheets)
Connects directly to the Content Team Google Spreadsheet:
- **Sheet 1**: Number of Articles Published Today
- **Sheet 2**: Word Count Output
- **Sheet 3**: Number of Articles Picked
- **Tabs**:
  1. **Daily**: Today vs Yesterday writer breakdown, daily velocity badges, and totals.
  2. **Weekly**: Last 7 Days, Previous 7 Days, Last 14 Days, and WoW growth indicators.
  3. **Monthly**: Historical volumes from April to September 2026 and cumulative output.
  4. **KPI & Leaderboard**: Quarterly Word Count Targets (396,000) & Article KPIs, achievement progress bars, deficit tracker, and 🥇 🥈 🥉 medals.
- **Auto-Refresh Engine**: Polls every 5 minutes (300s) with countdown timer and manual "Sync Now" button.

### 4. Category Wise Date Tab
Derived from `Category Wise AMJ`:
- Normalized `Date | Category Name | Articles Count` records.
- Date selector and category dropdown filters.
- Search bar and CSV export.
- Also populated directly in the Google Sheet under the new tab `Category Wise Date`.

### 5. Upcoming Events & Topic Tracker (Synced Live from Google Sheets)
Connects directly to the Content Master Sheet:
- **Sheet**: [Master Content Sheet (gid: 1107724151)](https://docs.google.com/spreadsheets/d/1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A/edit?gid=1107724151#gid=1107724151)
- **Priority Last 7 Days**: Defaults to the last 7 days from Column A dates (`11th–18th September 2026`), with quick options for Today, Last 3 Days, Last 14 Days, Last 30 Days, and All Dates.
- **Column Mapping**:
  - **Column A**: Date
  - **Column G**: Category (State PSC, State Exams, Defence, Banking, Engineering, Teaching, SSC, etc.)
  - **Column H**: Topic / Page Title
  - **Column N**: Status (Done, Drafted, Pending)
  - **Column E**: Picked By
  - **Column F**: Priority (P0, P1)
  - **Column P**: Live Article / Admin URL
- **Key Executive KPIs**:
  - **Events Planned**
  - **Articles Done**
  - **Pending Deficit**: `Number of Events Planned − Number of Articles Done`
  - **Completion Rate (%)**
- **Category Progress Breakdown**: Interactive chips showing Planned vs Done per Category with progress bars.
- **Filters & Export**: Date filter, Category filter with real-time count badges, Status filter, search bar, and CSV export.

---

## Deployment Instructions

### Deploy to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Content Team Dashboard Q4 2026"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/content-team-dashboard.git
git push -u origin main
```

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Import your GitHub repository `content-team-dashboard`.
3. Keep default settings (Framework Preset: **Other**) and click **Deploy**.
4. Your live dashboard URL will be available immediately with SSL enabled!

---

## Local Development
To view the dashboard locally:
- Simply open `index.html` in any web browser, OR
- Run using Python's built-in server:
  ```bash
  python -m http.server 3000
  ```
  Then open `http://localhost:3000` in your browser.
