/**
 * Q4 2026 Content Roster Data (1st October - 31st December 2026)
 * 
 * Rules applied:
 * 1. Team A & Team B alternate weekly between News ("Event Pages") and Content.
 * 2. In News weeks: Night shift is NOT done by one person for the complete week.
 *    Instead, the 5 team members rotate day-by-day (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
 * 3. In Content weeks, members are assigned to Child Pages, SEO Optimization, or High Intent.
 * 4. Strictly guaranteed: No member receives the same content task on consecutive content weeks.
 * 5. In Team B, Trishala replaces Shilpa Singh.
 * 6. Archana alternates between Event Pages (News) and Upcoming Drafts.
 */

const ROSTER_CONFIG = {
  quarter: "Q4 2026 (Oct - Dec)",
  dateRange: "01 October 2026 - 31 December 2026",
  teams: {
    teamA: {
      name: "Team A",
      members: ["Sonika", "Archita", "Shemaila", "Somya", "Atul"]
    },
    teamB: {
      name: "Team B",
      members: ["Nadeem", "Shilpa Kohli", "Aditi", "Mohit", "Trishala"]
    },
    upcoming: {
      name: "Upcoming Drafts",
      members: ["Archana"]
    }
  },

  categoryMentors: [
    { mentor: "Aditi", category: "Police Exams" },
    { mentor: "Archita", category: "State-Govt Exams" },
    { mentor: "Trishala", category: "State PSC" },
    { mentor: "Mohit", category: "Insurance & Engineering" },
    { mentor: "Atul", category: "Defence Exams" },
    { mentor: "Shilpa", category: "Teaching Exams" },
    { mentor: "Shemaila", category: "Banking Exams" },
    { mentor: "Falguni", category: "Regulatory / Others" },
    { mentor: "Sonika", category: "Others & K12 Prep" },
    { mentor: "Nadeem", category: "Railways Exams" },
    { mentor: "Somya", category: "SSC Exams" }
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
      dateRange: "05 Oct - 11 Oct 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      // Daily night shift rotation for Team A (News week)
      nightShiftDaily: [
        { day: "Monday (05 Oct)", member: "Sonika" },
        { day: "Tuesday (06 Oct)", member: "Archita" },
        { day: "Wednesday (07 Oct)", member: "Shemaila" },
        { day: "Thursday (08 Oct)", member: "Somya" },
        { day: "Friday (09 Oct)", member: "Atul" },
        { day: "Saturday (10 Oct)", member: "Sonika" },
        { day: "Sunday (11 Oct)", member: "Archita" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Mon, Sat" },
        "Archita": { team: "Team A", task: "News", nightDays: "Tue, Sun" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Wed" },
        "Somya": { team: "Team A", task: "News", nightDays: "Thu" },
        "Atul": { team: "Team A", task: "News", nightDays: "Fri" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 2,
      name: "Week 2",
      dateRange: "12 Oct - 18 Oct 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      // Daily night shift rotation for Team B (News week)
      nightShiftDaily: [
        { day: "Monday (12 Oct)", member: "Nadeem" },
        { day: "Tuesday (13 Oct)", member: "Shilpa Kohli" },
        { day: "Wednesday (14 Oct)", member: "Aditi" },
        { day: "Thursday (15 Oct)", member: "Mohit" },
        { day: "Friday (16 Oct)", member: "Trishala" },
        { day: "Saturday (17 Oct)", member: "Nadeem" },
        { day: "Sunday (18 Oct)", member: "Shilpa Kohli" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Archita": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Somya": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Atul": { team: "Team A", task: "High Intent", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Mon, Sat" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Tue, Sun" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Wed" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Thu" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Fri" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 3,
      name: "Week 3",
      dateRange: "19 Oct - 25 Oct 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (19 Oct)", member: "Shemaila" },
        { day: "Tuesday (20 Oct)", member: "Somya" },
        { day: "Wednesday (21 Oct)", member: "Atul" },
        { day: "Thursday (22 Oct)", member: "Sonika" },
        { day: "Friday (23 Oct)", member: "Archita" },
        { day: "Saturday (24 Oct)", member: "Shemaila" },
        { day: "Sunday (25 Oct)", member: "Somya" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Thu" },
        "Archita": { team: "Team A", task: "News", nightDays: "Fri" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Mon, Sat" },
        "Somya": { team: "Team A", task: "News", nightDays: "Tue, Sun" },
        "Atul": { team: "Team A", task: "News", nightDays: "Wed" },

        "Nadeem": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Aditi": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Mohit": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Trishala": { team: "Team B", task: "High Intent", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 4,
      name: "Week 4",
      dateRange: "26 Oct - 01 Nov 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightShiftDaily: [
        { day: "Monday (26 Oct)", member: "Aditi" },
        { day: "Tuesday (27 Oct)", member: "Mohit" },
        { day: "Wednesday (28 Oct)", member: "Trishala" },
        { day: "Thursday (29 Oct)", member: "Nadeem" },
        { day: "Friday (30 Oct)", member: "Shilpa Kohli" },
        { day: "Saturday (31 Oct)", member: "Aditi" },
        { day: "Sunday (01 Nov)", member: "Mohit" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Archita": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Somya": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Atul": { team: "Team A", task: "Child Pages", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Thu" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Fri" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Mon, Sat" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Tue, Sun" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Wed" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 5,
      name: "Week 5",
      dateRange: "02 Nov - 08 Nov 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (02 Nov)", member: "Atul" },
        { day: "Tuesday (03 Nov)", member: "Sonika" },
        { day: "Wednesday (04 Nov)", member: "Archita" },
        { day: "Thursday (05 Nov)", member: "Shemaila" },
        { day: "Friday (06 Nov)", member: "Somya" },
        { day: "Saturday (07 Nov)", member: "Atul" },
        { day: "Sunday (08 Nov)", member: "Sonika" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Tue, Sun" },
        "Archita": { team: "Team A", task: "News", nightDays: "Wed" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Thu" },
        "Somya": { team: "Team A", task: "News", nightDays: "Fri" },
        "Atul": { team: "Team A", task: "News", nightDays: "Mon, Sat" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 6,
      name: "Week 6",
      dateRange: "09 Nov - 15 Nov 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightShiftDaily: [
        { day: "Monday (09 Nov)", member: "Trishala" },
        { day: "Tuesday (10 Nov)", member: "Nadeem" },
        { day: "Wednesday (11 Nov)", member: "Shilpa Kohli" },
        { day: "Thursday (12 Nov)", member: "Aditi" },
        { day: "Friday (13 Nov)", member: "Mohit" },
        { day: "Saturday (14 Nov)", member: "Trishala" },
        { day: "Sunday (15 Nov)", member: "Nadeem" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Archita": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Somya": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Atul": { team: "Team A", task: "High Intent", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Tue, Sun" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Wed" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Thu" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Fri" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Mon, Sat" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 7,
      name: "Week 7",
      dateRange: "16 Nov - 22 Nov 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (16 Nov)", member: "Archita" },
        { day: "Tuesday (17 Nov)", member: "Shemaila" },
        { day: "Wednesday (18 Nov)", member: "Somya" },
        { day: "Thursday (19 Nov)", member: "Atul" },
        { day: "Friday (20 Nov)", member: "Sonika" },
        { day: "Saturday (21 Nov)", member: "Archita" },
        { day: "Sunday (22 Nov)", member: "Shemaila" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Fri" },
        "Archita": { team: "Team A", task: "News", nightDays: "Mon, Sat" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Tue, Sun" },
        "Somya": { team: "Team A", task: "News", nightDays: "Wed" },
        "Atul": { team: "Team A", task: "News", nightDays: "Thu" },

        "Nadeem": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Aditi": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Mohit": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Trishala": { team: "Team B", task: "High Intent", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 8,
      name: "Week 8",
      dateRange: "23 Nov - 29 Nov 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightShiftDaily: [
        { day: "Monday (23 Nov)", member: "Shilpa Kohli" },
        { day: "Tuesday (24 Nov)", member: "Aditi" },
        { day: "Wednesday (25 Nov)", member: "Mohit" },
        { day: "Thursday (26 Nov)", member: "Trishala" },
        { day: "Friday (27 Nov)", member: "Nadeem" },
        { day: "Saturday (28 Nov)", member: "Shilpa Kohli" },
        { day: "Sunday (29 Nov)", member: "Aditi" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Archita": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Somya": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Atul": { team: "Team A", task: "Child Pages", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Fri" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Mon, Sat" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Tue, Sun" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Wed" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Thu" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 9,
      name: "Week 9",
      dateRange: "30 Nov - 06 Dec 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (30 Nov)", member: "Somya" },
        { day: "Tuesday (01 Dec)", member: "Atul" },
        { day: "Wednesday (02 Dec)", member: "Sonika" },
        { day: "Thursday (03 Dec)", member: "Archita" },
        { day: "Friday (04 Dec)", member: "Shemaila" },
        { day: "Saturday (05 Dec)", member: "Somya" },
        { day: "Sunday (06 Dec)", member: "Atul" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Wed" },
        "Archita": { team: "Team A", task: "News", nightDays: "Thu" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Fri" },
        "Somya": { team: "Team A", task: "News", nightDays: "Mon, Sat" },
        "Atul": { team: "Team A", task: "News", nightDays: "Tue, Sun" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 10,
      name: "Week 10",
      dateRange: "07 Dec - 13 Dec 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightShiftDaily: [
        { day: "Monday (07 Dec)", member: "Mohit" },
        { day: "Tuesday (08 Dec)", member: "Trishala" },
        { day: "Wednesday (09 Dec)", member: "Nadeem" },
        { day: "Thursday (10 Dec)", member: "Shilpa Kohli" },
        { day: "Friday (11 Dec)", member: "Aditi" },
        { day: "Saturday (12 Dec)", member: "Mohit" },
        { day: "Sunday (13 Dec)", member: "Trishala" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Archita": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Somya": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Atul": { team: "Team A", task: "High Intent", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Wed" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Thu" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Fri" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Mon, Sat" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Tue, Sun" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 11,
      name: "Week 11",
      dateRange: "14 Dec - 20 Dec 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (14 Dec)", member: "Sonika" },
        { day: "Tuesday (15 Dec)", member: "Archita" },
        { day: "Wednesday (16 Dec)", member: "Shemaila" },
        { day: "Thursday (17 Dec)", member: "Somya" },
        { day: "Friday (18 Dec)", member: "Atul" },
        { day: "Saturday (19 Dec)", member: "Sonika" },
        { day: "Sunday (20 Dec)", member: "Archita" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Mon, Sat" },
        "Archita": { team: "Team A", task: "News", nightDays: "Tue, Sun" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Wed" },
        "Somya": { team: "Team A", task: "News", nightDays: "Thu" },
        "Atul": { team: "Team A", task: "News", nightDays: "Fri" },

        "Nadeem": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Aditi": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Mohit": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Trishala": { team: "Team B", task: "High Intent", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    },
    {
      id: 12,
      name: "Week 12",
      dateRange: "21 Dec - 27 Dec 2026",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightShiftDaily: [
        { day: "Monday (21 Dec)", member: "Nadeem" },
        { day: "Tuesday (22 Dec)", member: "Shilpa Kohli" },
        { day: "Wednesday (23 Dec)", member: "Aditi" },
        { day: "Thursday (24 Dec)", member: "Mohit" },
        { day: "Friday (25 Dec)", member: "Trishala" },
        { day: "Saturday (26 Dec)", member: "Nadeem" },
        { day: "Sunday (27 Dec)", member: "Shilpa Kohli" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Archita": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Somya": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Atul": { team: "Team A", task: "Child Pages", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "News", nightDays: "Mon, Sat" },
        "Shilpa Kohli": { team: "Team B", task: "News", nightDays: "Tue, Sun" },
        "Aditi": { team: "Team B", task: "News", nightDays: "Wed" },
        "Mohit": { team: "Team B", task: "News", nightDays: "Thu" },
        "Trishala": { team: "Team B", task: "News", nightDays: "Fri" },

        "Archana": { team: "Upcoming", task: "Upcoming Drafts", nightDays: "-" }
      }
    },
    {
      id: 13,
      name: "Week 13",
      dateRange: "28 Dec - 31 Dec 2026",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightShiftDaily: [
        { day: "Monday (28 Dec)", member: "Shemaila" },
        { day: "Tuesday (29 Dec)", member: "Somya" },
        { day: "Wednesday (30 Dec)", member: "Atul" },
        { day: "Thursday (31 Dec)", member: "Sonika" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "News", nightDays: "Thu" },
        "Archita": { team: "Team A", task: "News", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "News", nightDays: "Mon" },
        "Somya": { team: "Team A", task: "News", nightDays: "Tue" },
        "Atul": { team: "Team A", task: "News", nightDays: "Wed" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

        "Archana": { team: "Upcoming", task: "News", nightDays: "-" }
      }
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ROSTER_CONFIG;
}
