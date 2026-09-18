/**
 * Q4 2026 Content Roster Data (1st October - 31st December 2026)
 * 
 * Rules applied:
 * 1. Team A & Team B alternate weekly between News ("Event Pages") and Content.
 * 2. In News weeks: Exactly one writer leads Night Update on call.
 *    Daily night shifts rotate Monday to Saturday (6 days).
 *    *** SUNDAY IS DELETED - NO ONE WORKS ON SUNDAY ***
 * 3. In Content weeks, members are assigned to Child Pages, SEO Optimization, or High Intent.
 * 4. Strictly guaranteed: No member receives the same content task on consecutive content weeks.
 * 5. In Team B, Trishala replaces Shilpa Singh.
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
    // -------------------------------------------------------------------------
    // Week 1: 05 Oct - 11 Oct 2026 (News: Team A | Night Lead: Sonika)
    // -------------------------------------------------------------------------
    {
      id: 1,
      name: "Wk 1",
      dateRange: "5 Oct–11 Oct",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Sonika",
      nightShiftDaily: [
        { day: "Mon (05 Oct)", member: "Sonika" },
        { day: "Tue (06 Oct)", member: "Archita" },
        { day: "Wed (07 Oct)", member: "Shemaila" },
        { day: "Thu (08 Oct)", member: "Somya" },
        { day: "Fri (09 Oct)", member: "Atul" },
        { day: "Sat (10 Oct)", member: "Sonika" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Thu" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Fri" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 2: 12 Oct - 18 Oct 2026 (News: Team B | Night Lead: Nadeem)
    // -------------------------------------------------------------------------
    {
      id: 2,
      name: "Wk 2",
      dateRange: "12 Oct–18 Oct",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Nadeem",
      nightShiftDaily: [
        { day: "Mon (12 Oct)", member: "Nadeem" },
        { day: "Tue (13 Oct)", member: "Shilpa Kohli" },
        { day: "Wed (14 Oct)", member: "Aditi" },
        { day: "Thu (15 Oct)", member: "Mohit" },
        { day: "Fri (16 Oct)", member: "Trishala" },
        { day: "Sat (17 Oct)", member: "Nadeem" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Archita": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Somya": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Atul": { team: "Team A", task: "High Intent", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Tue" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Wed" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Thu" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Fri" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 3: 19 Oct - 25 Oct 2026 (News: Team A | Night Lead: Archita)
    // -------------------------------------------------------------------------
    {
      id: 3,
      name: "Wk 3",
      dateRange: "19 Oct–25 Oct",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Archita",
      nightShiftDaily: [
        { day: "Mon (19 Oct)", member: "Archita" },
        { day: "Tue (20 Oct)", member: "Shemaila" },
        { day: "Wed (21 Oct)", member: "Somya" },
        { day: "Thu (22 Oct)", member: "Atul" },
        { day: "Fri (23 Oct)", member: "Sonika" },
        { day: "Sat (24 Oct)", member: "Archita" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Fri" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Thu" },

        "Nadeem": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Aditi": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Mohit": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Trishala": { team: "Team B", task: "High Intent", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 4: 26 Oct - 01 Nov 2026 (News: Team B | Night Lead: Shilpa Kohli)
    // -------------------------------------------------------------------------
    {
      id: 4,
      name: "Wk 4",
      dateRange: "26 Oct–1 Nov",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Shilpa Kohli",
      nightShiftDaily: [
        { day: "Mon (26 Oct)", member: "Shilpa Kohli" },
        { day: "Tue (27 Oct)", member: "Aditi" },
        { day: "Wed (28 Oct)", member: "Mohit" },
        { day: "Thu (29 Oct)", member: "Trishala" },
        { day: "Fri (30 Oct)", member: "Nadeem" },
        { day: "Sat (31 Oct)", member: "Shilpa Kohli" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Archita": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Somya": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Atul": { team: "Team A", task: "SEO Optimization", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Fri" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Tue" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Wed" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Thu" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 5: 02 Nov - 08 Nov 2026 (News: Team A | Night Lead: Shemaila)
    // -------------------------------------------------------------------------
    {
      id: 5,
      name: "Wk 5",
      dateRange: "2 Nov–8 Nov",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Shemaila",
      nightShiftDaily: [
        { day: "Mon (02 Nov)", member: "Shemaila" },
        { day: "Tue (03 Nov)", member: "Somya" },
        { day: "Wed (04 Nov)", member: "Atul" },
        { day: "Thu (05 Nov)", member: "Sonika" },
        { day: "Fri (06 Nov)", member: "Archita" },
        { day: "Sat (07 Nov)", member: "Shemaila" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Thu" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Fri" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Wed" },

        "Nadeem": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Aditi": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Mohit": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Trishala": { team: "Team B", task: "SEO Optimization", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 6: 09 Nov - 15 Nov 2026 (News: Team B | Night Lead: Aditi)
    // -------------------------------------------------------------------------
    {
      id: 6,
      name: "Wk 6",
      dateRange: "9 Nov–15 Nov",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Aditi",
      nightShiftDaily: [
        { day: "Mon (09 Nov)", member: "Aditi" },
        { day: "Tue (10 Nov)", member: "Mohit" },
        { day: "Wed (11 Nov)", member: "Trishala" },
        { day: "Thu (12 Nov)", member: "Nadeem" },
        { day: "Fri (13 Nov)", member: "Shilpa Kohli" },
        { day: "Sat (14 Nov)", member: "Aditi" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Archita": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Somya": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Atul": { team: "Team A", task: "Child Pages", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Thu" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Fri" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Tue" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Wed" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 7: 16 Nov - 22 Nov 2026 (News: Team A | Night Lead: Somya)
    // -------------------------------------------------------------------------
    {
      id: 7,
      name: "Wk 7",
      dateRange: "16 Nov–22 Nov",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Somya",
      nightShiftDaily: [
        { day: "Mon (16 Nov)", member: "Somya" },
        { day: "Tue (17 Nov)", member: "Atul" },
        { day: "Wed (18 Nov)", member: "Sonika" },
        { day: "Thu (19 Nov)", member: "Archita" },
        { day: "Fri (20 Nov)", member: "Shemaila" },
        { day: "Sat (21 Nov)", member: "Somya" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Thu" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Fri" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Tue" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 8: 23 Nov - 29 Nov 2026 (News: Team B | Night Lead: Mohit)
    // -------------------------------------------------------------------------
    {
      id: 8,
      name: "Wk 8",
      dateRange: "23 Nov–29 Nov",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Mohit",
      nightShiftDaily: [
        { day: "Mon (23 Nov)", member: "Mohit" },
        { day: "Tue (24 Nov)", member: "Trishala" },
        { day: "Wed (25 Nov)", member: "Nadeem" },
        { day: "Thu (26 Nov)", member: "Shilpa Kohli" },
        { day: "Fri (27 Nov)", member: "Aditi" },
        { day: "Sat (28 Nov)", member: "Mohit" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Archita": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Somya": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Atul": { team: "Team A", task: "High Intent", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Wed" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Thu" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Fri" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Tue" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 9: 30 Nov - 06 Dec 2026 (News: Team A | Night Lead: Atul)
    // -------------------------------------------------------------------------
    {
      id: 9,
      name: "Wk 9",
      dateRange: "30 Nov–6 Dec",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Atul",
      nightShiftDaily: [
        { day: "Mon (30 Nov)", member: "Atul" },
        { day: "Tue (01 Dec)", member: "Sonika" },
        { day: "Wed (02 Dec)", member: "Archita" },
        { day: "Thu (03 Dec)", member: "Shemaila" },
        { day: "Fri (04 Dec)", member: "Somya" },
        { day: "Sat (05 Dec)", member: "Atul" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Thu" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Fri" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },

        "Nadeem": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Aditi": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Mohit": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Trishala": { team: "Team B", task: "High Intent", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 10: 07 Dec - 13 Dec 2026 (News: Team B | Night Lead: Trishala)
    // -------------------------------------------------------------------------
    {
      id: 10,
      name: "Wk 10",
      dateRange: "7 Dec–13 Dec",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Trishala",
      nightShiftDaily: [
        { day: "Mon (07 Dec)", member: "Trishala" },
        { day: "Tue (08 Dec)", member: "Nadeem" },
        { day: "Wed (09 Dec)", member: "Shilpa Kohli" },
        { day: "Thu (10 Dec)", member: "Aditi" },
        { day: "Fri (11 Dec)", member: "Mohit" },
        { day: "Sat (12 Dec)", member: "Trishala" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Archita": { team: "Team A", task: "Child Pages", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Somya": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Atul": { team: "Team A", task: "Child Pages", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Tue" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Wed" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Thu" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Fri" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 11: 14 Dec - 20 Dec 2026 (News: Team A | Night Lead: Sonika)
    // -------------------------------------------------------------------------
    {
      id: 11,
      name: "Wk 11",
      dateRange: "14 Dec–20 Dec",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Sonika",
      nightShiftDaily: [
        { day: "Mon (14 Dec)", member: "Sonika" },
        { day: "Tue (15 Dec)", member: "Archita" },
        { day: "Wed (16 Dec)", member: "Shemaila" },
        { day: "Thu (17 Dec)", member: "Somya" },
        { day: "Fri (18 Dec)", member: "Atul" },
        { day: "Sat (19 Dec)", member: "Sonika" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "Mon, Sat" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Thu" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Fri" },

        "Nadeem": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Aditi": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Mohit": { team: "Team B", task: "Child Pages", nightDays: "-" },
        "Trishala": { team: "Team B", task: "SEO Optimization", nightDays: "-" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 12: 21 Dec - 27 Dec 2026 (News: Team B | Night Lead: Nadeem)
    // -------------------------------------------------------------------------
    {
      id: 12,
      name: "Wk 12",
      dateRange: "21 Dec–27 Dec",
      newsTeam: "Team B",
      contentTeam: "Team A",
      nightLead: "Nadeem",
      nightShiftDaily: [
        { day: "Mon (21 Dec)", member: "Nadeem" },
        { day: "Tue (22 Dec)", member: "Shilpa Kohli" },
        { day: "Wed (23 Dec)", member: "Aditi" },
        { day: "Thu (24 Dec)", member: "Mohit" },
        { day: "Fri (25 Dec)", member: "Trishala" },
        { day: "Sat (26 Dec)", member: "Nadeem" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Archita": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Shemaila": { team: "Team A", task: "SEO Optimization", nightDays: "-" },
        "Somya": { team: "Team A", task: "High Intent", nightDays: "-" },
        "Atul": { team: "Team A", task: "SEO Optimization", nightDays: "-" },

        "Nadeem": { team: "Team B", task: "Event Pages", nightDays: "Mon, Sat" },
        "Shilpa Kohli": { team: "Team B", task: "Event Pages", nightDays: "Tue" },
        "Aditi": { team: "Team B", task: "Event Pages", nightDays: "Wed" },
        "Mohit": { team: "Team B", task: "Event Pages", nightDays: "Thu" },
        "Trishala": { team: "Team B", task: "Event Pages", nightDays: "Fri" },

      }
    },

    // -------------------------------------------------------------------------
    // Week 13: 28 Dec - 31 Dec 2026 (News: Team A | Night Lead: Archita)
    // -------------------------------------------------------------------------
    {
      id: 13,
      name: "Wk 13",
      dateRange: "28 Dec–31 Dec",
      newsTeam: "Team A",
      contentTeam: "Team B",
      nightLead: "Archita",
      nightShiftDaily: [
        { day: "Mon (28 Dec)", member: "Archita" },
        { day: "Tue (29 Dec)", member: "Shemaila" },
        { day: "Wed (30 Dec)", member: "Somya" },
        { day: "Thu (31 Dec)", member: "Atul" }
      ],
      tasks: {
        "Sonika": { team: "Team A", task: "Event Pages", nightDays: "-" },
        "Archita": { team: "Team A", task: "Event Pages", nightDays: "Mon" },
        "Shemaila": { team: "Team A", task: "Event Pages", nightDays: "Tue" },
        "Somya": { team: "Team A", task: "Event Pages", nightDays: "Wed" },
        "Atul": { team: "Team A", task: "Event Pages", nightDays: "Thu" },

        "Nadeem": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Shilpa Kohli": { team: "Team B", task: "SEO Optimization", nightDays: "-" },
        "Aditi": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Mohit": { team: "Team B", task: "High Intent", nightDays: "-" },
        "Trishala": { team: "Team B", task: "Child Pages", nightDays: "-" },

      }
    }
  ]
};
