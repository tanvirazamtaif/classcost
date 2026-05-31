export const EDU = {
  preprimary: {
    id:"preprimary", group:"early", label:"Pre-Primary / Playgroup", shortLabel:"Pre-Primary",
    icon:"🧒", color:"rose", bgColor:"bg-rose-50", borderColor:"border-rose-300",
    desc:"Playgroup, Nursery, KG-1, KG-2",
    levels:["Playgroup","Nursery","KG-1","KG-2","Reception"],
    periodLabel:"Year", semLabel:"Term", courseLabel:"Activity",
    institutionLabel:"School Name",
    semTypes:["term"], hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Registration Fee","Annual Activity Fee","Sports Fee","Transport Fee","Tiffin Fee"],
    periodicUnit:"monthly",
    hasHostel:false, hasCoaching:false, hasBatch:false, hasExam:false,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:false, hasLabFee:false, hasWaiver:false,
    note:"Fees are mostly monthly. No formal exams.",
  },
  primary: {
    id:"primary", group:"school", label:"Class 1–5 (Primary)", shortLabel:"Class 1–5",
    icon:"🏫", color:"sky", bgColor:"bg-sky-50", borderColor:"border-sky-300",
    desc:"Primary — Bangla, English Medium, or Ebtedayee (madrasha)",
    levels:["Class 1","Class 2","Class 3","Class 4","Class 5"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Annual Exam Fee","Development Fee","Library Fee","Science Kit Fee","Tiffin Fee"],
    periodicUnit:"monthly",
    hasHostel:false, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:false, hasLabFee:false, hasWaiver:false,
    note:"Class 1–5. PEC / Primary Terminal exams.",
    variants:[
      { id:"govt_primary",    label:"Government Primary School" },
      { id:"private_primary", label:"Private Primary School"    },
      { id:"english_medium",  label:"English Medium (KG to 5)"  },
      { id:"madrasha_primary",label:"Madrasha (Ebtedaye)"        },
    ],
  },
  junior: {
    id:"junior", group:"school", label:"Class 6–8 (Junior Secondary)", shortLabel:"Class 6–8",
    icon:"🏫", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"Junior — Bangla, English Medium, or early Dakhil",
    levels:["Class 6","Class 7","Class 8"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Annual Exam Fee","JSC Form Fill-up","Library Fee","Science Lab Fee","Development Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"JSC/JDC Board Exam at Class 8.",
    variants:[
      { id:"regular",   label:"Regular Secondary School" },
      { id:"cadet",     label:"Cadet College (Junior)"   },
      { id:"madrasha",  label:"Madrasha (Dakhil Junior)" },
    ],
  },
  secondary: {
    id:"secondary", group:"school", label:"Class 9–10 (SSC / O-Level / Dakhil)", shortLabel:"Class 9–10",
    icon:"📘", color:"blue", bgColor:"bg-blue-50", borderColor:"border-blue-300",
    desc:"Secondary — SSC, O-Level (IGCSE / Edexcel), Dakhil, or SSC Vocational",
    levels:["Class 9","Class 10 (SSC Year)"],
    periodLabel:"Class", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","SSC Registration Fee","SSC Form Fill-up","Practical Exam Fee","Library Fee","Science Lab Fee","Development Fee","Re-admission Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"SSC / Dakhil / O-Level Board Exam.",
    variants:[
      { id:"ssc_general",  label:"SSC — General"          },
      { id:"ssc_science",  label:"SSC — Science Group"    },
      { id:"ssc_commerce", label:"SSC — Commerce Group"   },
      { id:"ssc_arts",     label:"SSC — Arts Group"       },
      { id:"dakhil",       label:"Dakhil (Madrasha SSC)"  },
      { id:"o_level",      label:"O-Level (IGCSE)"        },
    ],
  },
  fullschool: {
    id:"fullschool", group:"school", label:"Full School (Class 1–12)", shortLabel:"Full School",
    icon:"🏫", color:"cyan", bgColor:"bg-cyan-50", borderColor:"border-cyan-300",
    desc:"Schools running Class 1 to 12 under one roof",
    levels:["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6","Class 7","Class 8","Class 9","Class 10","Class 11 (HSC-1)","Class 12 (HSC-2)"],
    periodLabel:"Class", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"School & College Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Annual Exam Fee","SSC Registration","SSC Form Fill-up","HSC Registration","HSC Form Fill-up","Lab Fee","Library Fee","Development Fee","Re-admission Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"Covers SSC + HSC. Separate fees for each board exam.",
    variants:[
      { id:"school_college",  label:"School & College (1–12)"    },
      { id:"cadet_college",   label:"Cadet College (Full)"        },
      { id:"cantonment",      label:"Cantonment School & College" },
      { id:"residential",     label:"Residential School (1–12)"  },
    ],
  },
  hsc: {
    id:"hsc", group:"college", label:"Class 11–12 (HSC / A-Level / Alim)", shortLabel:"Class 11–12",
    icon:"🏛️", color:"violet", bgColor:"bg-violet-50", borderColor:"border-violet-300",
    desc:"Higher Secondary — HSC, A-Level (Cambridge / Edexcel / IB), Alim, or HSC Voc/BM",
    levels:["Class 11 (1st Year)","Class 12 (2nd Year / Board Exam)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"College Name",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","HSC Registration Fee","HSC Form Fill-up Fee","Practical Exam Fee","Lab Fee","Library Fee","Development Fee","Re-admission Fee","Tuition Fee (Monthly)"],
    periodicUnit:"mixed",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"HSC Board Exam at Class 12. Only 2 years — no lower classes in institution.",
    variants:[
      { id:"hsc_general",  label:"HSC — General"          },
      { id:"hsc_science",  label:"HSC — Science Group"    },
      { id:"hsc_commerce", label:"HSC — Commerce Group"   },
      { id:"hsc_arts",     label:"HSC — Humanities Group" },
      { id:"alim",         label:"Alim (Madrasha HSC)"    },
      { id:"a_level",      label:"A-Level (IGCSE)"        },
      { id:"bm",           label:"Business Management"    },
    ],
  },
  degree_college: {
    id:"degree_college", group:"college", label:"Degree College (Pass Course)", shortLabel:"Degree College",
    icon:"🏛️", color:"amber", bgColor:"bg-amber-50", borderColor:"border-amber-300",
    desc:"BA / BSc / BCom 3-year Pass Course under National University",
    levels:["1st Year","2nd Year","3rd Year (Final)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"College Name",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Form Fill-up Fee","Practical Fee","Library Fee","Development Fee","National University Fee","Re-admission Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"National University affiliated. Yearly exams.",
  },
  honours_college: {
    id:"honours_college", group:"college", label:"Honours College (4-Year)", shortLabel:"Honours",
    icon:"🏛️", color:"orange", bgColor:"bg-orange-50", borderColor:"border-orange-300",
    desc:"4-Year Honours under National University (NU)",
    levels:["1st Year","2nd Year","3rd Year","4th Year (Honours Final)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"College Name",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Form Fill-up Fee","Practical Fee","Library Fee","Development Fee","NU Registration Fee","Re-admission Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"National University Honours. 4-year annual exam system.",
    variants:[
      { id:"nu_honours", label:"NU — Honours (College Affiliated)" },
      { id:"nu_evening", label:"NU — Evening Programme"           },
    ],
  },
  undergrad_private: {
    id:"undergrad_private", group:"university", label:"Private University (UG)", shortLabel:"Private Uni",
    icon:"🎓", color:"indigo", bgColor:"bg-indigo-50", borderColor:"border-indigo-300",
    desc:"Semester-based private university undergrad (3–5 years)",
    levels:["1st Year","2nd Year","3rd Year","4th Year","5th Year"],
    periodLabel:"Year", semLabel:"Semester", courseLabel:"Course",
    institutionLabel:"University Name",
    hasSemesterChoice:true,
    semChoiceOptions:[{v:"tri",l:"Trimester (3/year)"},{v:"bi",l:"Semester (2/year)"}],
    feeTypes:["Admission Fee","Semester Fee","Course Fee","Lab Fee","Library Fee","Activity Fee","Student Welfare Fee","Penalty Fee","Re-admission Fee","Waiver Adjustment"],
    periodicUnit:"semester",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:true,
    note:"Credit-based. Semester/trimester system. Waivers based on admission test score.",
  },
  undergrad_public: {
    id:"undergrad_public", group:"university", label:"Public University (UG)", shortLabel:"Public Uni",
    icon:"🏛️", color:"green", bgColor:"bg-green-50", borderColor:"border-green-300",
    desc:"Session-based public university undergrad (4–5 years)",
    levels:["1st Year","2nd Year","3rd Year","4th Year","5th Year (Honours)"],
    periodLabel:"Year", semLabel:"Year/Session", courseLabel:"Course",
    institutionLabel:"University Name",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Hall Admission","Session Fee","Form Fill-up Fee","Lab Fee","Library Fee","Sports Fee","Medical Fee","Re-admission Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"Hall/dormitory is common. Session system, not semester.",
    variants:[
      { id:"general",    label:"General (Arts/Science/Commerce)" },
      { id:"engineering",label:"Engineering (BUET, CUET, RUET)"  },
      { id:"medical",    label:"Medical / Dental (MBBS, BDS)"    },
      { id:"agriculture",label:"Agricultural University"          },
      { id:"science_tech",label:"Science & Technology University" },
    ],
  },
  masters: {
    id:"masters", group:"postgrad", label:"Masters / Postgrad", shortLabel:"Masters / Postgrad",
    icon:"👩‍🎓", color:"purple", bgColor:"bg-purple-50", borderColor:"border-purple-300",
    desc:"Masters (MA / MSc / MBA / MEng), MPhil / PhD, or Kamil (madrasha)",
    levels:["1st Semester","2nd Semester","3rd Semester","4th Semester"],
    periodLabel:"Semester", semLabel:"Semester", courseLabel:"Course",
    institutionLabel:"University / Institution",
    hasSemesterChoice:true,
    semChoiceOptions:[{v:"tri",l:"Trimester"},{v:"bi",l:"Semester"}],
    feeTypes:["Admission Fee","Semester Fee","Course Fee","Thesis Fee","Research Fee","Library Fee","Lab Fee","Penalty Fee"],
    periodicUnit:"semester",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:true,
    variants:[
      {v:"mba",  l:"MBA"},    {v:"msc",   l:"MSc"},
      {v:"ma",   l:"MA"},     {v:"meng",  l:"MEng / M.Engg"},
      {v:"llm",  l:"LLM"},    {v:"mpharm",l:"M.Pharm"},
    ],
  },
  research: {
    id:"research", group:"postgrad", label:"MPhil / PhD (Research)", shortLabel:"MPhil / PhD",
    icon:"🔬", color:"fuchsia", bgColor:"bg-fuchsia-50", borderColor:"border-fuchsia-300",
    desc:"Research degrees — MPhil (2yr) / PhD (3–5yr)",
    levels:["Year 1","Year 2","Year 3","Year 4","Year 5 (Extension)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Research Module",
    institutionLabel:"University",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Annual Fee","Research Fee","Thesis Submission Fee","Lab Fee","Library Fee","Conference Fee","Publication Fee","Extension Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:false,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:false, hasLabFee:true, hasWaiver:false,
    note:"Supervisor-guided research. No coursework exams after Year 1.",
    variants:[
      {v:"mphil",l:"MPhil"},{v:"phd",l:"PhD"},{v:"integrated",l:"Integrated MPhil-PhD"},
    ],
  },
  diploma: {
    id:"diploma", group:"diploma", label:"Diploma", shortLabel:"Diploma",
    icon:"📜", color:"emerald", bgColor:"bg-emerald-50", borderColor:"border-emerald-300",
    desc:"Polytechnic, Medical Technology, Nursing, Pharmacy (post-SSC, 3–4 yrs)",
    levels:["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"],
    periodLabel:"Semester", semLabel:"Semester", courseLabel:"Subject",
    institutionLabel:"Polytechnic / Institute",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Semester Fee","Tuition Fee","Lab Fee","Workshop Fee","Library Fee","Practical Exam Fee","Board Registration Fee","Industrial Attachment Fee","Development Fee","Re-admission Fee"],
    periodicUnit:"semester",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"4-year polytechnic diploma (8 semesters). BTEB / State Board affiliated.",
    variants:[
      {v:"engineering", l:"Diploma in Engineering"},
      {v:"medical",     l:"Diploma in Medical Technology"},
      {v:"nursing",     l:"Diploma in Nursing"},
      {v:"pharmacy",    l:"Diploma in Pharmacy"},
      {v:"agriculture", l:"Diploma in Agriculture"},
      {v:"textile",     l:"Diploma in Textile"},
      {v:"other",       l:"Other Diploma"},
    ],
  },

  // ═══════════════ GENERIC UNDERGRAD (catch-all for the 6th picker bucket) ═══════════════
  undergrad: {
    id:"undergrad", group:"university", label:"Undergraduate", shortLabel:"Undergrad",
    icon:"🎓", color:"indigo", bgColor:"bg-indigo-50", borderColor:"border-indigo-300",
    desc:"Bachelor's — Honours / Pass / Public Uni / Private Uni / Engineering / Medical / Fazil",
    levels:["1st Year / 1st Semester","2nd Year / 2nd Semester","3rd Year / 3rd Semester","4th Year / 4th Semester","5th Year (Extension)"],
    periodLabel:"Year", semLabel:"Semester / Year", courseLabel:"Course / Subject",
    institutionLabel:"University / College",
    hasSemesterChoice:true,
    semChoiceOptions:[{v:"tri",l:"Trimester"},{v:"bi",l:"Semester"},{v:"yearly",l:"Yearly (session-based)"}],
    feeTypes:["Admission Fee","Semester / Session Fee","Tuition Fee","Course / Credit Fee","Form Fill-up Fee","Practical Fee","Lab Fee","Library Fee","Development Fee","Hostel Fee","Re-admission Fee","Penalty Fee","Convocation Fee"],
    periodicUnit:"semester",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:true,
    note:"Inclusive undergrad bucket. Switch to a more specific type later in Settings if you want stricter fee categories.",
  },

  // ═══════════════ ENGLISH MEDIUM STREAM ═══════════════
  em_primary: {
    id:"em_primary", group:"em_school", label:"Primary (English Medium)", shortLabel:"EM Primary",
    icon:"🏫", color:"blue", bgColor:"bg-blue-50", borderColor:"border-blue-300",
    desc:"KG–Class 5 in English Medium school",
    levels:["Play","Nursery","KG","Class 1","Class 2","Class 3","Class 4","Class 5"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Re-admission Fee","Term Exam Fee","Library Fee","Sports Fee","Art & Craft Fee","Transport Fee","Tiffin Fee","Activity Fee"],
    periodicUnit:"monthly",
    hasHostel:false, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"English-medium primary. Term-based exams (typically 2–3 per year).",
  },
  em_junior: {
    id:"em_junior", group:"em_school", label:"Junior Secondary (English Medium)", shortLabel:"EM Junior",
    icon:"🏫", color:"blue", bgColor:"bg-blue-50", borderColor:"border-blue-300",
    desc:"Class 6–8 English Medium (pre-O-Level)",
    levels:["Class 6","Class 7","Class 8"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Re-admission Fee","Term Exam Fee","Library Fee","Lab Fee","Sports Fee","Transport Fee","Tiffin Fee","Activity Fee"],
    periodicUnit:"monthly",
    hasHostel:false, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"Bridge years before O-Level / IGCSE.",
  },
  em_olevel: {
    id:"em_olevel", group:"em_school", label:"O-Level (IGCSE / Edexcel)", shortLabel:"O-Level",
    icon:"📚", color:"blue", bgColor:"bg-blue-50", borderColor:"border-blue-300",
    desc:"Cambridge IGCSE or Edexcel O-Level (≈ Class 9–10)",
    levels:["O-Level Year 1","O-Level Year 2 (Exam Year)","Re-take"],
    periodLabel:"Year", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Re-admission Fee","Term Exam Fee","Subject Registration Fee","Subject Entry Fee (per paper)","Mock Exam Fee","Lab Fee","Library Fee","Coaching / Batch Fee","Transport Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"Per-paper exam entry fees (£60–90 per subject typical). Subject choice matters.",
    variants:[
      {v:"cambridge", l:"Cambridge IGCSE"},
      {v:"edexcel",   l:"Edexcel O-Level"},
      {v:"ib_myp",    l:"IB MYP"},
    ],
  },
  em_alevel: {
    id:"em_alevel", group:"em_college", label:"A-Level (Cambridge / Edexcel)", shortLabel:"A-Level",
    icon:"📚", color:"blue", bgColor:"bg-blue-50", borderColor:"border-blue-300",
    desc:"Cambridge A-Level / Edexcel A-Level / IB Diploma (≈ Class 11–12)",
    levels:["AS Level (Year 1)","A2 Level (Year 2)","Re-take"],
    periodLabel:"Year", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"School / College Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Re-admission Fee","Term Exam Fee","Subject Registration Fee","Subject Entry Fee (per paper)","Mock Exam Fee","SAT / IELTS Coaching","Lab Fee","Library Fee","Coaching / Batch Fee","Transport Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"Per-subject paper fees. SAT / IELTS coaching often runs in parallel.",
    variants:[
      {v:"cambridge", l:"Cambridge A-Level"},
      {v:"edexcel",   l:"Edexcel A-Level"},
      {v:"ib_dp",     l:"IB Diploma Programme"},
    ],
  },

  // ═══════════════ MADRASHA STREAM ═══════════════
  madrasha_ebtedayee: {
    id:"madrasha_ebtedayee", group:"madrasha_primary", label:"Ebtedayee (Primary Madrasha)", shortLabel:"Ebtedayee",
    icon:"🕌", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"Class 1–5 madrasha education (Bangla + Arabic + religious subjects)",
    levels:["Class 1","Class 2","Class 3","Class 4","Class 5"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"Madrasha Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Annual Fee","Annual Exam Fee","Book Fee","Sports Fee","Tiffin Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:false, hasLabFee:false, hasWaiver:false,
    note:"Primary-level madrasha under BMEB.",
  },
  madrasha_dakhil: {
    id:"madrasha_dakhil", group:"madrasha_secondary", label:"Dakhil (SSC equivalent)", shortLabel:"Dakhil",
    icon:"🕌", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"Class 6–10, Bangladesh Madrasha Education Board (BMEB)",
    levels:["Class 6","Class 7","Class 8","Class 9","Class 10 (Dakhil Exam Year)"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Subject",
    institutionLabel:"Madrasha Name",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Annual Fee","Annual Exam Fee","Board Registration Fee","Form Fill-up Fee","Practical Exam Fee","Library Fee","Hostel Fee","Tiffin Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:true,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"Dakhil = SSC-level board exam under BMEB.",
  },
  madrasha_alim: {
    id:"madrasha_alim", group:"madrasha_college", label:"Alim (HSC equivalent)", shortLabel:"Alim",
    icon:"🕌", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"Class 11–12, BMEB Alim certificate",
    levels:["Class 11 (Alim 1st Year)","Class 12 (Alim Exam Year)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"Madrasha Name",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Monthly Tuition","Board Registration Fee","Form Fill-up Fee","Practical Exam Fee","Library Fee","Hostel Fee"],
    periodicUnit:"mixed",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"Alim = HSC-equivalent. 2 years.",
  },
  madrasha_fazil: {
    id:"madrasha_fazil", group:"madrasha_university", label:"Fazil (Honours equivalent)", shortLabel:"Fazil",
    icon:"🕌", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"3–4 year Fazil degree (Honours-equivalent), Islamic Arabic University",
    levels:["1st Year","2nd Year","3rd Year","4th Year"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"Madrasha / Islamic University",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Form Fill-up Fee","Practical Fee","Library Fee","Hostel Fee","Re-admission Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"Fazil = Honours-equivalent, Islamic Arabic University affiliated.",
  },
  madrasha_kamil: {
    id:"madrasha_kamil", group:"madrasha_postgrad", label:"Kamil (Masters equivalent)", shortLabel:"Kamil",
    icon:"🕌", color:"teal", bgColor:"bg-teal-50", borderColor:"border-teal-300",
    desc:"1–2 year Kamil degree (Masters-equivalent)",
    levels:["1st Year","2nd Year"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Subject",
    institutionLabel:"Madrasha / Islamic University",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Thesis Fee","Library Fee","Hostel Fee","Re-admission Fee"],
    periodicUnit:"yearly",
    hasHostel:true, hasCoaching:false, hasBatch:false, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:false, hasWaiver:false,
    note:"Kamil = Masters-equivalent. Specialization tracks.",
    variants:[
      {v:"hadith", l:"Kamil — Hadith"},
      {v:"tafsir", l:"Kamil — Tafsir"},
      {v:"fiqh",   l:"Kamil — Fiqh"},
      {v:"adab",   l:"Kamil — Arabic Literature"},
    ],
  },

  // ═══════════════ TECHNICAL VOCATIONAL ═══════════════
  tech_ssc_voc: {
    id:"tech_ssc_voc", group:"tech_school", label:"SSC Vocational", shortLabel:"SSC Voc",
    icon:"🔧", color:"amber", bgColor:"bg-amber-50", borderColor:"border-amber-300",
    desc:"Class 9–10 SSC Vocational under BTEB",
    levels:["Class 9","Class 10 (SSC Voc Exam Year)"],
    periodLabel:"Class", semLabel:"Term", courseLabel:"Trade Subject",
    institutionLabel:"Technical School / TSC",
    hasSemesterChoice:false,
    feeTypes:["Monthly Tuition","Admission Fee","Board Registration Fee","Practical Exam Fee","Workshop Fee","Tools / Equipment Fee","Library Fee","Form Fill-up Fee"],
    periodicUnit:"monthly",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"2-year SSC Voc under BTEB. Workshops + general subjects.",
  },
  tech_hsc_voc: {
    id:"tech_hsc_voc", group:"tech_college", label:"HSC Vocational / BM", shortLabel:"HSC Voc / BM",
    icon:"🔧", color:"amber", bgColor:"bg-amber-50", borderColor:"border-amber-300",
    desc:"Class 11–12 HSC Vocational or BM (Business Management)",
    levels:["Class 11","Class 12 (Exam Year)"],
    periodLabel:"Year", semLabel:"Year", courseLabel:"Trade Subject",
    institutionLabel:"Technical / BM Institute",
    hasSemesterChoice:false,
    feeTypes:["Admission Fee","Session Fee","Board Registration Fee","Practical Exam Fee","Workshop Fee","Library Fee","Tools Fee","Form Fill-up Fee"],
    periodicUnit:"mixed",
    hasHostel:true, hasCoaching:true, hasBatch:true, hasExam:true,
    hasCanteen:true, hasTransport:true, hasTiffin:false,
    hasPenalty:true, hasLabFee:true, hasWaiver:false,
    note:"HSC Voc / BM under BTEB.",
    variants:[
      {v:"voc", l:"HSC Vocational"},
      {v:"bm",  l:"HSC Business Management"},
    ],
  },
};

// ════════════════════════════════════════════════════════════════
//  STREAMS — the new top-level taxonomy. Onboarding asks for stream
//  first, then for stage within that stream. Each EDU id maps to
//  exactly one stream via STREAM_OF (single source of truth).
// ════════════════════════════════════════════════════════════════
export const EDU_STREAMS = [
  { id:"bangla",     label:"Bangla Medium",          icon:"🇧🇩", color:"emerald",
    desc:"Government & private NCTB-curriculum schools (Bangla)" },
  { id:"english",    label:"English Medium",         icon:"🇬🇧", color:"blue",
    desc:"Cambridge / Edexcel / IB schools (English)" },
  { id:"madrasha",   label:"Madrasha",               icon:"🕌",  color:"teal",
    desc:"Ebtedayee → Dakhil → Alim → Fazil → Kamil" },
  { id:"technical",  label:"Technical / Polytechnic", icon:"🔧",  color:"amber",
    desc:"SSC Voc / HSC Voc / 4-year Diploma" },
  { id:"university", label:"University & Postgrad",   icon:"🎓",  color:"indigo",
    desc:"Public / private undergrad, Masters, MPhil / PhD" },
];

export const STREAM_OF = {
  // Bangla medium
  preprimary:"bangla", primary:"bangla", junior:"bangla", secondary:"bangla", fullschool:"bangla",
  hsc:"bangla", degree_college:"bangla", honours_college:"bangla",
  // English medium
  em_primary:"english", em_junior:"english", em_olevel:"english", em_alevel:"english",
  // Madrasha
  madrasha_ebtedayee:"madrasha", madrasha_dakhil:"madrasha", madrasha_alim:"madrasha",
  madrasha_fazil:"madrasha",     madrasha_kamil:"madrasha",
  // Technical
  tech_ssc_voc:"technical", tech_hsc_voc:"technical", diploma:"technical",
  // University / postgrad
  undergrad:"university",
  undergrad_private:"university", undergrad_public:"university",
  masters:"university",           research:"university",
};

// Auto-derived inverse: stream id → ordered list of EDU ids belonging to it.
// Order is the iteration order of STREAM_OF, which mirrors educational sequence.
export const EDU_BY_STREAM = Object.entries(STREAM_OF).reduce((acc, [eduId, streamId]) => {
  (acc[streamId] = acc[streamId] || []).push(eduId);
  return acc;
}, {});

// Legacy export — kept so older callers don't break. Prefer EDU_STREAMS.
export const EDU_GROUPS = EDU_STREAMS.map(s => ({
  id: s.id, label: s.label, icon: s.icon, color: s.color, ids: EDU_BY_STREAM[s.id] || [],
}));

// ════════════════════════════════════════════════════════════════
//  EDU_PICKER — the ACTUAL onboarding picker. 7 broad buckets the
//  student self-identifies into. Each bucket explicitly lists what
//  it covers in its label/desc so e.g. an A-Level student knows to
//  pick "Class 11–12". The granular EDU entries above stay in the
//  catalog for power features & legacy data, but onboarding stays flat.
//  Ordered by typical student progression.
// ════════════════════════════════════════════════════════════════
export const EDU_PICKER = [
  "primary",     // Class 1–5
  "junior",      // Class 6–8
  "secondary",   // Class 9–10  (SSC / O-Level / Dakhil)
  "hsc",         // Class 11–12 (HSC / A-Level / Alim)
  "diploma",     // Polytechnic / Medical / Nursing / Pharmacy
  "undergrad",   // Honours / Pass / Public / Private / Fazil / Engineering / Medical
  "masters",     // Masters / MPhil / PhD / Kamil
];

export const PROMOTION_CONFIG = {
  preprimary:       { mode:"smart",  nudgeMonth:0, nudgeDay:1,  snoozeDays:30,  termLabel:"academic year" },
  primary:          { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  junior:           { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  secondary:        { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  fullschool:       { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  hsc:              { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"year" },
  degree_college:   { mode:"manual", nudgeMonth:5, nudgeDay:1,  snoozeDays:60,  termLabel:"session",
                      manualNote:"NU sessions often run 6–18 months late. Update manually." },
  honours_college:  { mode:"manual", nudgeMonth:5, nudgeDay:1,  snoozeDays:60,  termLabel:"session",
                      manualNote:"National University Honours — update session manually." },
  undergrad_private:{ mode:"smart",  nudgeMonth:4, nudgeDay:15, snoozeDays:14,  termLabel:"semester",
                      secondNudge:{ month:11, day:15 } },
  undergrad_public: { mode:"manual", nudgeMonth:5, nudgeDay:1,  snoozeDays:60,  termLabel:"session",
                      manualNote:"Public university sessions may be delayed. Update manually." },
  masters:          { mode:"smart",  nudgeMonth:4, nudgeDay:15, snoozeDays:14,  termLabel:"semester",
                      secondNudge:{ month:11, day:15 } },
  research:         { mode:"never",  nudgeMonth:0, nudgeDay:1,  snoozeDays:365, termLabel:"year",
                      manualNote:"Research duration is open-ended. Update year manually." },
  diploma:          { mode:"smart",  nudgeMonth:5, nudgeDay:15, snoozeDays:30,  termLabel:"semester" },
  // English Medium
  em_primary:       { mode:"smart",  nudgeMonth:6, nudgeDay:15, snoozeDays:30,  termLabel:"academic year" },
  em_junior:        { mode:"smart",  nudgeMonth:6, nudgeDay:15, snoozeDays:30,  termLabel:"academic year" },
  em_olevel:        { mode:"manual", nudgeMonth:4, nudgeDay:1,  snoozeDays:60,  termLabel:"exam session",
                      manualNote:"O-Level results land May/June and Oct/Nov — confirm before advancing." },
  em_alevel:        { mode:"manual", nudgeMonth:7, nudgeDay:1,  snoozeDays:60,  termLabel:"exam session",
                      manualNote:"A-Level results land Aug — confirm year transition." },
  // Madrasha
  madrasha_ebtedayee:{ mode:"smart", nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  madrasha_dakhil:  { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  madrasha_alim:    { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"year" },
  madrasha_fazil:   { mode:"manual", nudgeMonth:5, nudgeDay:1,  snoozeDays:60,  termLabel:"session",
                      manualNote:"Islamic Arabic University sessions can shift — update manually." },
  madrasha_kamil:   { mode:"manual", nudgeMonth:5, nudgeDay:1,  snoozeDays:60,  termLabel:"session" },
  // Technical Voc
  tech_ssc_voc:     { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"academic year" },
  tech_hsc_voc:     { mode:"smart",  nudgeMonth:0, nudgeDay:5,  snoozeDays:30,  termLabel:"year" },
  // Generic undergrad bucket
  undergrad:        { mode:"smart",  nudgeMonth:4, nudgeDay:15, snoozeDays:14,  termLabel:"semester",
                      secondNudge:{ month:11, day:15 } },
};

export const shouldNudgeToday = (profile, promotionState) => {
  if (!profile?.educationLevel || !profile?.classYear) return false;
  const cfg = PROMOTION_CONFIG[profile.educationLevel];
  if (!cfg || cfg.mode === "never") return false;
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const year = now.getFullYear();
  const mod = EDU[profile.educationLevel];
  const levels = mod?.levels || [];
  const curIdx = levels.indexOf(profile.classYear);
  if (curIdx >= levels.length - 1) return false;
  const nudgeDate = new Date(year, cfg.nudgeMonth, cfg.nudgeDay);
  const daysDiff = Math.floor((now - nudgeDate) / 86400000);
  const inWindow = daysDiff >= 0 && daysDiff <= 7;
  const inWindow2 = cfg.secondNudge
    ? (() => { const d2 = new Date(year, cfg.secondNudge.month, cfg.secondNudge.day); const diff2 = Math.floor((now-d2)/86400000); return diff2>=0&&diff2<=7; })()
    : false;
  if (!inWindow && !inWindow2) return false;
  if (promotionState?.lastAnsweredYear === year) return false;
  if (promotionState?.snoozedUntil && new Date(promotionState.snoozedUntil) > now) return false;
  if (profile.enrolledAt) {
    const monthsSinceEnroll = (now - new Date(profile.enrolledAt)) / (30*86400000);
    if (monthsSinceEnroll < 8) return false;
  }
  return true;
};

// Bangladesh schools, colleges, universities, madrasas, and polytechnics.
// Curated — not exhaustive. The autocomplete in AddEntityPage uses these as
// suggestions but still accepts custom typed names for anything not listed.
// Keys map to education stages (preprimary → research). The "school" level in
// the UI dropdown pulls from primary + junior + secondary + fullschool keys.

// Schools that span Class 1 through 12 — appear in both School and College
// dropdowns. Kept as one source-of-truth array and reused below.
const FULL_SCHOOLS_BD = [
  "Viqarunnisa Noon School & College","Monipur High School & College","Motijheel Ideal School & College",
  "Rajuk Uttara Model College","Dhaka Residential Model College","Cantonment English School & College",
  "Milestone College","BAF Shaheen College Dhaka","BAF Shaheen College Kurmitola","BAF Shaheen College Tejgaon",
  "Adamjee Cantonment Public School","Mirpur Cantonment Public School & College","Bir Shreshtha Noor Mohammad Public School & College",
  "St. Joseph Higher Secondary School","St. Gregory's High School & College","Saint Francis Xavier's Girls' High School",
  "Cambrian School & College","Mastermind School","Scholastica School","Sunbeams School","Maple Leaf International School",
  "South Breeze School","Aga Khan School","Glenrich International School","Australian International School Dhaka",
  "Mohammadpur Preparatory School & College","Government Laboratory High School","Dhaka Collegiate School",
  "Dhanmondi Tutorial","Willes Little Flower School & College","Birshreshtha Munshi Abdur Rouf Public School & College",
  "Chittagong Collegiate School","Chittagong Grammar School","Bangladesh Navy School & College Chattogram",
  "Government Muslim High School Chittagong","St. Placid's School & College","Sylhet Government Pilot High School",
  "Sylhet Cadet College","Rajshahi Collegiate School","Khulna Zilla School","Khulna Public College",
  "Government P.N. Girls' High School Khulna","Pabna Zilla School","Barishal Zilla School","Rangpur Zilla School",
  "Comilla Zilla School","Comilla Cadet College","Faujdarhat Cadet College","Jhenidah Cadet College",
  "Mirzapur Cadet College","Rajshahi Cadet College","Rangpur Cadet College","Barisal Cadet College",
  "Pabna Cadet College","Cumilla Cadet College","Mymensingh Girls' Cadet College","Feni Girls' Cadet College",
  "Joypurhat Girls' Cadet College",
];

export const INSTITUTIONS = {
  preprimary:       ["Maple Leaf International","Scholastica (Preschool)","Sunbeams Preschool","PlayPen","ABC International Pre-School","Tiny Tots","Hummingbird Preschool","Little Flower Nursery","Glenrich Preschool","South Breeze Preschool","Australian International Preschool","Apollo Tots","Junior Laboratory School"],

  primary:          ["Viqarunnisa Noon School","Monipur High School","Motijheel Ideal School","Willes Little Flower School","BRAC Primary School","Aga Khan School","Milestone College (Primary)","Cantonment Board School","Sunbeams School","Mastermind School","Scholastica School","Government Laboratory High School","South Point School & College (Primary)","Adamjee Cantonment Public School","Dhaka Cantonment Girls' Public School","Birshrestha Noor Mohammad Public School","Mohammadpur Preparatory School","Mirpur Cantonment Public School (Primary)","South Breeze School","Glenrich International School","Australian International School Dhaka"],

  junior:           ["Viqarunnisa Noon School","Monipur High School & College","Motijheel Ideal School","St. Joseph Higher Secondary School","Holy Cross Girls' High School","Dhaka Cantonment Girls' Public School","Willes Little Flower School","Government Laboratory High School","Dhaka Collegiate School","Tejgaon Government Boys' High School","Mohammadpur Government High School","Saint Francis Xavier's Girls' High School","Bir Shreshtha Munshi Abdur Rouf Public School","Banani Bidya Niketan","Udayan Higher Secondary School","BAF Shaheen College Dhaka","Adamjee Cantonment Public School","Mirpur Cantonment Public School","Mastermind School","Scholastica School","Sunbeams School","Maple Leaf International School","Cambrian School & College"],

  secondary:        ["Viqarunnisa Noon School & College","Monipur High School & College","Motijheel Ideal School & College","Holy Cross Girls' High School","Rajuk Uttara Model College","St. Joseph Higher Secondary School","Dhaka Residential Model College","Milestone College","Cantonment English School & College","Mirpur Cantonment Public School & College","Adamjee Cantonment Public School","BAF Shaheen College Dhaka","Bir Shreshtha Noor Mohammad Public School & College","Government Laboratory High School","Saint Francis Xavier's Girls' High School","Maple Leaf International School","Scholastica","Sunbeams","Mastermind School","Cambrian School & College","Willes Little Flower School & College","Mohammadpur Preparatory School & College","Saint Gregory's High School & College","Udayan Higher Secondary School","Chittagong Grammar School","Chittagong Collegiate School","St. Placid's School & College Chittagong","Government Muslim High School Chittagong","Sylhet Government Pilot High School","Rajshahi Collegiate School","Khulna Zilla School","Pabna Zilla School","Comilla Zilla School","Rangpur Zilla School","Barishal Zilla School"],

  fullschool:       FULL_SCHOOLS_BD,

  hsc:              [...FULL_SCHOOLS_BD, "Notre Dame College Dhaka","Notre Dame College Mymensingh","Holy Cross College Dhaka","Dhaka College","Eden Mohila College","Tejgaon College","Begum Badrunnessa Government Girls' College","Government Bangla College","Government Titumir College","Government Shaheed Suhrawardy College","Government Bangabandhu College","Govt. Science College","Rajshahi College","Chittagong College","Chittagong Government Women's College","Hajiganj Government College","MC College Sylhet","Sylhet Government College","Murari Chand College","Carmichael College Rangpur","BL College Khulna","Brojomohun College Barishal","Government Edward College Pabna","Comilla Victoria Government College","Government Tolaram College Narayanganj","Government Saadat College Tangail","Government Ananda Mohan College Mymensingh","Mymensingh Government College","Cantonment Public School & College Saidpur","Bangladesh Navy College Dhaka","Bangladesh Navy College Chattogram","Birshreshtha Munshi Abdur Rouf Public College","Birshreshtha Mostafa Kamal College"],

  degree_college:   ["Titumir College","Siddheswari Degree College","Dhaka City College","Government Bangla College","Kabi Nazrul Government College","Government Tolaram College","Government Hazi Muhammad Mohsin College","Government Shaheed Suhrawardy College","Lalmatia Mohila College","Begum Badrunnessa Government Girls' College","Mohammadpur Kendriya College","Tejgaon College","Mohammadpur Mohila College","Sher-e-Bangla Nagar Government Mahila College","Government Saadat College","Government Ananda Mohan College","Government Edward College","Carmichael College","BL College","Brojomohun College","MC College Sylhet","Hajiganj Government College","Comilla Victoria Government College","Government Azizul Haque College","Rajshahi College (Degree)","Chittagong College (Degree)"],

  honours_college:  ["Titumir College (Honours)","Dhaka City College (Honours)","Government Bangla College (Honours)","Eden Mohila College (Honours)","Jahangirnagar College","National Ideal College","Government Shaheed Suhrawardy College (Honours)","Begum Badrunnessa Government Girls' College (Honours)","Kabi Nazrul Government College (Honours)","Mohammadpur Kendriya College (Honours)","Government Tolaram College (Honours)","Government Ananda Mohan College (Honours)","Rajshahi College (Honours)","Chittagong College (Honours)","MC College Sylhet (Honours)","Carmichael College (Honours)","BL College (Honours)","Government Azizul Haque College (Honours)","Comilla Victoria Government College (Honours)"],

  undergrad_private:[
    "North South University (NSU)","BRAC University","Independent University Bangladesh (IUB)","East West University (EWU)",
    "Daffodil International University (DIU)","United International University (UIU)","American International University-Bangladesh (AIUB)",
    "Green University of Bangladesh","Southeast University","Stamford University Bangladesh","Ahsanullah University of Science & Technology (AUST)",
    "BRAC University","University of Liberal Arts Bangladesh (ULAB)","University of Asia Pacific (UAP)","Bangladesh University (BU)",
    "Bangladesh University of Business and Technology (BUBT)","Bangladesh University of Health Sciences","Canadian University of Bangladesh",
    "Central Women's University","Eastern University","European University of Bangladesh","Manarat International University",
    "Northern University Bangladesh","Notre Dame University Bangladesh","Premier University Chittagong","Prime University",
    "Primeasia University","Sonargaon University","State University of Bangladesh","Uttara University","World University of Bangladesh",
    "Z. H. Sikder University of Science & Technology","BGC Trust University Bangladesh","Bangladesh Islami University",
    "International University of Business Agriculture and Technology (IUBAT)","Asian University of Bangladesh","Atish Dipankar University of Science & Technology",
    "Britannia University","City University","Cox's Bazar International University","Dhaka International University","First Capital University of Bangladesh",
    "Gono Bishwabidyalay","International Standard University","Khwaja Yunus Ali University","Leading University","Metropolitan University Sylhet",
    "Millennium University","North East University Bangladesh","North Western University","People's University of Bangladesh","Port City International University",
    "Pundra University of Science and Technology","Queens University","Rajshahi Science & Technology University","Ranada Prasad Shaha University","Royal University of Dhaka",
    "Shanto-Mariam University of Creative Technology","Times University Bangladesh","University of Creative Technology Chittagong","Victoria University of Bangladesh",
    "Bangladesh University of Professionals (BUP)",
  ],

  undergrad_public: [
    "University of Dhaka (DU)","Bangladesh University of Engineering and Technology (BUET)","Jahangirnagar University (JU)",
    "University of Rajshahi (RU)","University of Chittagong (CU)","Shahjalal University of Science and Technology (SUST)",
    "Khulna University (KU)","Bangladesh Agricultural University (BAU)","Jagannath University (JNU)","Islamic University Bangladesh (IU)",
    "Comilla University","Jatiya Kabi Kazi Nazrul Islam University","Begum Rokeya University Rangpur","Mawlana Bhashani Science and Technology University (MBSTU)",
    "Hajee Mohammad Danesh Science and Technology University (HSTU)","Patuakhali Science and Technology University","Sher-e-Bangla Agricultural University","Bangabandhu Sheikh Mujibur Rahman Agricultural University","Bangabandhu Sheikh Mujib Medical University","Chittagong Veterinary and Animal Sciences University","Sylhet Agricultural University","Khulna Agricultural University","Khulna University of Engineering & Technology (KUET)","Rajshahi University of Engineering & Technology (RUET)","Chittagong University of Engineering & Technology (CUET)","Dhaka University of Engineering & Technology (DUET)","Bangladesh Textile University","Dhaka University of Professional Studies","Pabna University of Science and Technology","Noakhali Science and Technology University","Jashore University of Science and Technology","Rangamati Science and Technology University","Bangabandhu Sheikh Mujibur Rahman Science and Technology University Gopalganj","Bangladesh Open University","Bangladesh University of Textiles","Bangladesh Maritime University","Aviation and Aerospace University Bangladesh","Bangabandhu Sheikh Mujibur Rahman Aviation and Aerospace University","Sheikh Hasina University Netrokona","Bangamata Sheikh Fojilatunnesa Mujib Science and Technology University","Chandpur Science and Technology University","Habiganj Agricultural University","Bangladesh Sugarcane Research Institute","Kishoreganj University","Sunamganj Science and Technology University","Pirojpur Science and Technology University","Thakurgaon University",
    "Bangladesh University of Professionals (BUP)","Islamic Arabic University","Bangladesh Smriti University","Sheikh Hasina Medical University Khulna",
    // Engineering & specialized
    "Bangladesh Army University of Science and Technology (BAUST)","Bangladesh Army University of Engineering and Technology (BAUET)","Bangladesh Army International University of Science and Technology (BAIUST)","Military Institute of Science and Technology (MIST)","Islamic University of Technology (IUT)",
    // Medical universities/colleges
    "Dhaka Medical College","Sir Salimullah Medical College","Sylhet MAG Osmani Medical College","Chittagong Medical College","Rajshahi Medical College","Mymensingh Medical College","Rangpur Medical College","Sher-e-Bangla Medical College Barishal","Cumilla Medical College","Faridpur Medical College","Khulna Medical College","Pabna Medical College","Dinajpur Medical College","Bogra Medical College","Jashore Medical College","Satkhira Medical College","M Abdur Rahim Medical College Dinajpur",
  ],

  masters:          ["University of Dhaka","BUET","NSU (MBA/MS)","BRAC University","IUB Graduate","IBA — MBA","East West University Graduate","SUST Graduate","Jahangirnagar University Graduate","BUP Graduate","Jagannath University Graduate","Khulna University Graduate","Rajshahi University Graduate","Chittagong University Graduate","IUT Graduate","MIST Graduate","Islamic University Graduate","DUET","KUET","RUET","CUET","Bangladesh Agricultural University Graduate","Bangabandhu Sheikh Mujib Medical University","BSMRSTU Graduate","HSTU Graduate","AIUB Graduate","UIU Graduate","Daffodil International University Graduate","Premier University Chittagong Graduate"],

  research:         ["University of Dhaka","BUET","Jahangirnagar University","SUST","University of Rajshahi","University of Chittagong","Bangladesh Agricultural University","Bangabandhu Sheikh Mujib Medical University","Khulna University","Jagannath University","Islamic University Bangladesh","Bangladesh University of Professionals","KUET","RUET","CUET","DUET","IUT","MIST","Bangabandhu Sheikh Mujibur Rahman Agricultural University","Sher-e-Bangla Agricultural University","Bangladesh Council of Scientific and Industrial Research (BCSIR)","Bangladesh Atomic Energy Commission","Bangladesh Institute of Development Studies (BIDS)","Centre for Policy Dialogue (CPD)","International Centre for Diarrhoeal Disease Research, Bangladesh (icddr,b)"],

  diploma:          ["Dhaka Polytechnic Institute","Chittagong Polytechnic Institute","Rajshahi Polytechnic Institute","Khulna Polytechnic Institute","Sylhet Polytechnic Institute","Barishal Polytechnic Institute","Mymensingh Polytechnic Institute","Comilla Polytechnic Institute","Faridpur Polytechnic Institute","Bogra Polytechnic Institute","Rangpur Polytechnic Institute","Pabna Polytechnic Institute","Dinajpur Polytechnic Institute","Tangail Polytechnic Institute","Bangladesh Sweden Polytechnic Institute (Kaptai)","Graphic Arts Institute","Bangladesh Institute of Glass and Ceramics","Bangladesh Survey Institute","Institute of Marine Technology","Institute of Health Technology (IHT)","Ahsanullah Institute of Technical Education","Daffodil Polytechnic Institute","BCMC College of Engineering and Technology","Imperial College of Engineering","Eastern University Polytechnic Wing"],

  // ─── English Medium (same school often runs Primary → Junior → O-Level → A-Level) ───
  em_primary:       ["Scholastica","Sunbeams School","Maple Leaf International School","Mastermind School","South Breeze School","Aga Khan School","Glenrich International School","Australian International School Dhaka","Cambrian School & College","International School Dhaka (ISD)","American International School Dhaka","Chittagong Grammar School","St. Joseph Higher Secondary School","Cambridge Bangladesh","Greenherald International School"],
  em_junior:        ["Scholastica","Sunbeams School","Maple Leaf International School","Mastermind School","South Breeze School","Aga Khan School","Glenrich International School","Australian International School Dhaka","Cambrian School & College","International School Dhaka (ISD)","American International School Dhaka","Chittagong Grammar School","St. Joseph Higher Secondary School","Cambridge Bangladesh","Greenherald International School"],
  em_olevel:        ["Scholastica","Sunbeams School","Maple Leaf International School","Mastermind School","Cambrian School & College","International School Dhaka (ISD)","American International School Dhaka","Chittagong Grammar School","Aga Khan School","Glenrich International School","South Breeze School","Greenherald International School","Bangladesh International Tutorial","Manarat International School","Playpen School","Tiger's Den School & College"],
  em_alevel:        ["Scholastica","Sunbeams School","Mastermind School","Cambrian School & College","Maple Leaf International School","International School Dhaka (ISD)","American International School Dhaka","Chittagong Grammar School","Aga Khan School","Greenherald International School","Playpen School","Tiger's Den School & College","South Point College","Academia","Bangladesh International Tutorial"],

  // ─── Madrasha ───
  madrasha_ebtedayee:["Al-Jamiatul Ahlia Darul Ulum Moinul Islam (Hathazari)","Jamia Islamia Patiya","Jamia Ahmadia Sunnia (Tongi)","Tamirul Millat Kamil Madrasa","Tejgaon Madrasa-e-Alia","Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Faridabad Madrasa","Mohammadpur Markaz Madrasa","Mirpur Jamia Mohammadia Arabia"],
  madrasha_dakhil:  ["Tamirul Millat Kamil Madrasa","Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Tejgaon Madrasa-e-Alia","Jamia Qurania Arabia Lalbagh","Sylhet Government Madrasa","Rajshahi Government Alia Madrasa","Chittagong Government Madrasa","Khulna Darus Salam Madrasa","Bhairab Hafizia Kawmi Madrasa"],
  madrasha_alim:    ["Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Tamirul Millat Kamil Madrasa","Sylhet Government Madrasa","Rajshahi Government Alia Madrasa","Chittagong Government Madrasa","Comilla Government Madrasa","Bogra Government Madrasa","Faridpur Government Madrasa"],
  madrasha_fazil:   ["Islamic Arabic University","Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Tamirul Millat Kamil Madrasa","Jamia Qurania Arabia Lalbagh","Al-Jamiatul Ahlia Darul Ulum Moinul Islam (Hathazari)","Jamia Islamia Patiya"],
  madrasha_kamil:   ["Islamic Arabic University","Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Tamirul Millat Kamil Madrasa","Jamia Qurania Arabia Lalbagh","Al-Jamiatul Ahlia Darul Ulum Moinul Islam (Hathazari)"],

  // ─── Technical Vocational ───
  tech_ssc_voc:     ["Dhaka Technical School & College","Chittagong Technical School & College","Sylhet Technical School & College","Rajshahi Technical School & College","Khulna Technical School & College","Barishal Technical School & College","Rangpur Technical School & College","Mymensingh Technical School & College","Comilla Technical School & College"],
  tech_hsc_voc:     ["Dhaka Technical School & College","Chittagong Technical School & College","Sylhet Technical School & College","Rajshahi Technical School & College","Khulna Technical School & College","Government Latifa Bawany Vocational Institute","Government Sheikh Hasina Polytechnic Institute","Government BM College","City BM College","National BM College"],

  // Generic undergrad — combined list from public + private (covers most cases)
  undergrad:        ["University of Dhaka","BUET","Jahangirnagar University","Rajshahi University","Chittagong University","SUST","Bangladesh Agricultural University","Bangabandhu Sheikh Mujib Medical University","KUET","RUET","CUET","DUET","IUT","MIST","Khulna University","Jagannath University","Bangladesh University of Professionals","Comilla University","Barishal University","North South University (NSU)","BRAC University","Independent University Bangladesh (IUB)","East West University (EWU)","Daffodil International University","United International University","American International University-Bangladesh (AIUB)","Ahsanullah University of Science & Technology (AUST)","Notre Dame University Bangladesh","ULAB","UAP","National University (Honours)","Islamic Arabic University (Fazil)","Bangladesh Open University","Various Honours / Degree colleges affiliated with NU"],

  madrasa:          ["Al-Jamiatul Ahlia Darul Ulum Moinul Islam (Hathazari)","Jamia Islamia Patiya","Jamia Ahmadia Sunnia (Tongi)","Jamia Qurania Arabia Lalbagh","Tamirul Millat Kamil Madrasa","Tejgaon Madrasa-e-Alia","Government Madrasa-e-Alia (Dhaka)","Dhaka Alia Madrasa","Jamia Tawakkulia Renga","Faridabad Madrasa","Char Monai Madrasa","Mohammadpur Markaz Madrasa","Banani Bait-ul-Mukarram Madrasa","Jamia Rahmania Arabia Dhaka","Darul Ulum Moinul Islam Hathazari","Jamia Islamia Yunusia Brahmanbaria","Jamia Madinatul Ulum Bashundhara","Jamia Hossainia Ashraful Ulum Boro Katara","Jamiatul Ummahatil Mu'minin","Jamia Imdadia Mahmoodia","Jamia Quranic Arabic University Lalbagh","Bhairab Hafizia Kawmi Madrasa","Mirpur Jamia Mohammadia Arabia","Mohila Madrasa Ar Rabita Tejgaon","Mahmudia Mohila Madrasa Mirpur","Darul Ihsan Madrasa Uttara","Sylhet Government Madrasa","Rajshahi Government Alia Madrasa","Chittagong Government Madrasa","Khulna Darus Salam Madrasa"],

  polytechnic:      ["Dhaka Polytechnic Institute","Chittagong Polytechnic Institute","Rajshahi Polytechnic Institute","Khulna Polytechnic Institute","Bogra Polytechnic Institute","Comilla Polytechnic Institute","Sylhet Polytechnic Institute","Mymensingh Polytechnic Institute","Barishal Polytechnic Institute","Rangpur Polytechnic Institute","Faridpur Polytechnic Institute","Pabna Polytechnic Institute","Dinajpur Polytechnic Institute","Magura Polytechnic Institute","Tangail Polytechnic Institute","Patuakhali Polytechnic Institute","Brahmanbaria Polytechnic Institute","Feni Polytechnic Institute","Munshiganj Polytechnic Institute","Narsingdi Polytechnic Institute","Naogaon Polytechnic Institute","Jhenidah Polytechnic Institute","Kushtia Polytechnic Institute","Lakshmipur Polytechnic Institute","Satkhira Polytechnic Institute","Sherpur Polytechnic Institute","Sunamganj Polytechnic Institute","Sirajganj Polytechnic Institute","Thakurgaon Polytechnic Institute","Bagerhat Polytechnic Institute","Bandarban Polytechnic Institute","Bhola Polytechnic Institute","Cox's Bazar Polytechnic Institute","Gazipur Polytechnic Institute","Gopalganj Polytechnic Institute","Habiganj Polytechnic Institute","Jamalpur Polytechnic Institute","Joypurhat Polytechnic Institute","Khagrachhari Polytechnic Institute","Lalmonirhat Polytechnic Institute","Mongla Polytechnic Institute","Moulvibazar Polytechnic Institute","Netrokona Polytechnic Institute","Nilphamari Polytechnic Institute","Pirojpur Polytechnic Institute","Rangamati Polytechnic Institute","Shariatpur Polytechnic Institute","Tangail Mohila Polytechnic Institute","Dhaka Mohila Polytechnic Institute","Rajshahi Mohila Polytechnic Institute"],
};
