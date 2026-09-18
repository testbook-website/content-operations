/**
 * Q4 2026 Content Roster Data (1st October - 31st December 2026)
 * 
 * Rules applied:
 * 1. Team A & Team B alternate weekly between News ("Event Pages") and Content.
 * 2. In News weeks, 1 member from the active team is assigned to Night Updates (fair 5-person rotation).
 * 3. In Content weeks, members are assigned to Child Pages, SEO Optimization, or High Intent.
 * 4. Strictly guaranteed: No member receives the same content task on consecutive content weeks.
 * 5. In Team B, Trishala replaces Shilpa Singh.
 * 6. Archana alternates between Event Pages (News) and Upcoming Drafts.
 */

const ROSTER_CONFIG = {
  quarter: "Q4 2026 (October - December)",
  dateRange: "01 October 2026 - 31 December 2026",
  teams: {
    teamA: {
      name: "Team A",
      members: ["Sonika", "Archita", "Shemaila", "Somya", "Atul"],
      color: "#4f46e5"
    },
    teamB: {
      name: "Team B",
      // Trishala used in place of Shilpa Singh as per instructions
      members: ["Nadeem", "Shilpa Kohli", "Aditi", "Mohit", "Trishala"],
      color: "#0891b2"
    },
    upcoming: {
      name: "Upcoming Drafts Team",
      members: ["Archana"],
      color: "#7c3aed"
    },
    prepTeam: {
      name: "Prep Team",
      members: ["Lehron", "Dhananjay", "Falguni", "Swathi", "Sumit Kumar", "Pavan", "Manicka", "Aniket"],
      color: "#059669"
    }
  },

  categoryMentors: [
    { mentor: "Aditi", category: "Police Exams", categoryOwner: "Aditi" },
    { mentor: "Archita", category: "State-Govt Exams", categoryOwner: "Archita" },
    { mentor: "Trishala", category: "State PSC", categoryOwner: "Trishala" },
    { mentor: "Mohit", category: "Insurance & Engineering", categoryOwner: "Mohit" },
    { mentor: "Atul", category: "Defence Exams", categoryOwner: "Atul" },
    { mentor: "Shilpa", category: "Teaching Exams", categoryOwner: "Shilpa" },
    { mentor: "Shemaila", category: "Banking Exams", categoryOwner: "Shemaila" },
    { mentor: "Falguni", category: "Regulatory / Others", categoryOwner: "Falguni" },
    { mentor: "Sonika", category: "Others & K12 Prep", categoryOwner: "Sonika" },
    { mentor: "Nadeem", category: "Railways Exams", categoryOwner: "Nadeem" },
    { mentor: "Somya", category: "SSC Exams", categoryOwner: "Somya" }
  ],

  prepTeamAssignments: [
    { member: "Lehron", domain: "UGC NET (Prep), Engineering" },
    { member: "Dhananjay", domain: "Engineering" },
    { member: "Falguni", domain: "UGC NET - History, PolSci, Others" },
    { member: "Swathi", domain: "UGC NET - Commerce, Paper1, Maths, Business" },
    { member: "Sumit Kumar", domain: "UGC NET - Geo" },
    { member: "Pavan", domain: "UPSC" },
    { member: "Manicka", domain: "UPSC - All Subjects" },
    { member: "Aniket", domain: "UPSC - All Arts Subjects" }
  ],

  weeks: [
    {
      id: 1,
      name: "Week 1",
      startDate: "2026-10-05",
      endDate: "2026-10-11",
      dateRange: "05 Oct - 11 Oct 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Sonika" },
      assignments: {
        // Team A (News Week - all on Event Pages, Sonika leads Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week)
        "Nadeem": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 2,
      name: "Week 2",
      startDate: "2026-10-12",
      endDate: "2026-10-18",
      dateRange: "12 Oct - 18 Oct 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Nadeem" },
      assignments: {
        // Team A (Content Week - strictly no repeat from Wk 13 of JAS)
        "Sonika": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Archita": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        "Somya": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Atul": { task: "High Intent", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Nadeem leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 3,
      name: "Week 3",
      startDate: "2026-10-19",
      endDate: "2026-10-25",
      dateRange: "19 Oct - 25 Oct 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Archita" },
      assignments: {
        // Team A (News Week - Archita on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 1)
        "Nadeem": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "High Intent", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 4,
      name: "Week 4",
      startDate: "2026-10-26",
      endDate: "2026-11-01",
      dateRange: "26 Oct - 01 Nov 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Shilpa Kohli" },
      assignments: {
        // Team A (Content Week - alternate tasks vs Wk 2)
        "Sonika": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Archita": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Somya": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Atul": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Shilpa Kohli leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 5,
      name: "Week 5",
      startDate: "2026-11-02",
      endDate: "2026-11-08",
      dateRange: "02 Nov - 08 Nov 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Shemaila" },
      assignments: {
        // Team A (News Week - Shemaila on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 3)
        "Nadeem": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 6,
      name: "Week 6",
      startDate: "2026-11-09",
      endDate: "2026-11-15",
      dateRange: "09 Nov - 15 Nov 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Aditi" },
      assignments: {
        // Team A (Content Week - alternate tasks vs Wk 4)
        "Sonika": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Archita": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        "Somya": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Atul": { task: "High Intent", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Aditi leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 7,
      name: "Week 7",
      startDate: "2026-11-16",
      endDate: "2026-11-22",
      dateRange: "16 Nov - 22 Nov 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Somya" },
      assignments: {
        // Team A (News Week - Somya on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 5)
        "Nadeem": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "High Intent", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 8,
      name: "Week 8",
      startDate: "2026-11-23",
      endDate: "2026-11-29",
      dateRange: "23 Nov - 29 Nov 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Mohit" },
      assignments: {
        // Team A (Content Week - alternate tasks vs Wk 6)
        "Sonika": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Archita": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Somya": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Atul": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Mohit leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 9,
      name: "Week 9",
      startDate: "2026-11-30",
      endDate: "2026-12-06",
      dateRange: "30 Nov - 06 Dec 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Atul" },
      assignments: {
        // Team A (News Week - Atul on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 7)
        "Nadeem": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 10,
      name: "Week 10",
      startDate: "2026-12-07",
      endDate: "2026-12-13",
      dateRange: "07 Dec - 13 Dec 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Trishala" },
      assignments: {
        // Team A (Content Week - alternate tasks vs Wk 8)
        "Sonika": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Archita": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        "Somya": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Atul": { task: "High Intent", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Trishala leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 11,
      name: "Week 11",
      startDate: "2026-12-14",
      endDate: "2026-12-20",
      dateRange: "14 Dec - 20 Dec 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Sonika" },
      assignments: {
        // Team A (News Week - Sonika on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 9)
        "Nadeem": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "High Intent", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 12,
      name: "Week 12",
      startDate: "2026-12-21",
      endDate: "2026-12-27",
      dateRange: "21 Dec - 27 Dec 2026",
      teamATheme: "Content",
      teamBTheme: "News",
      nightUpdate: { team: "Team B", member: "Nadeem" },
      assignments: {
        // Team A (Content Week - alternate tasks vs Wk 10)
        "Sonika": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Archita": { task: "High Intent", nightUpdate: false, team: "Team A" },
        "Shemaila": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Somya": { task: "SEO Optimization", nightUpdate: false, team: "Team A" },
        "Atul": { task: "Child Pages", nightUpdate: false, team: "Team A" },
        // Team B (News Week - Nadeem leads Night Updates)
        "Nadeem": { task: "News (Event Pages)", nightUpdate: true, team: "Team B" },
        "Shilpa Kohli": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "News (Event Pages)", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "Upcoming Drafts", nightUpdate: false, team: "Upcoming" }
      }
    },
    {
      id: 13,
      name: "Week 13",
      startDate: "2026-12-28",
      endDate: "2026-12-31",
      dateRange: "28 Dec - 31 Dec 2026",
      teamATheme: "News",
      teamBTheme: "Content",
      nightUpdate: { team: "Team A", member: "Archita" },
      assignments: {
        // Team A (News Week - Archita on Night Updates)
        "Sonika": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Archita": { task: "News (Event Pages)", nightUpdate: true, team: "Team A" },
        "Shemaila": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Somya": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        "Atul": { task: "News (Event Pages)", nightUpdate: false, team: "Team A" },
        // Team B (Content Week - alternate tasks vs Wk 11)
        "Nadeem": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Shilpa Kohli": { task: "SEO Optimization", nightUpdate: false, team: "Team B" },
        "Aditi": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Mohit": { task: "High Intent", nightUpdate: false, team: "Team B" },
        "Trishala": { task: "Child Pages", nightUpdate: false, team: "Team B" },
        // Upcoming
        "Archana": { task: "News (Event Pages)", nightUpdate: false, team: "Upcoming" }
      }
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ROSTER_CONFIG;
}
