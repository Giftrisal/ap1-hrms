export type Language = 'en' | 'ne';

export const translations = {
  en: {
    // App Brand
    appName: "Goinfi-HR",
    appSubTitle: "HR & Attendance System",
    
    // Navigation
    navDashboard: "Dashboard",
    navStaff: "Staff Management",
    navAttendance: "Attendance Logs",
    navShifts: "Shift Management",
    navLeaves: "Leave & Holidays",
    navPayroll: "Payroll & Payslips",
    navFieldDuty: "Field Duty & WFH",
    navAssets: "Asset Tracking",
    navPortal: "My Staff Portal",
    navReports: "Reports & Analytics",
    navSettings: "Settings & Hardware",
    logout: "Logout",
    
    // Roles
    roleAdmin: "Administrator",
    roleHR: "HR Manager",
    roleEmployee: "Employee",
    
    // Dashboard Cards
    totalEmployees: "Total Staff",
    presentToday: "Present Today",
    lateToday: "Late Today",
    absentToday: "Absent Today",
    onLeaveToday: "On Leave",
    biometricStatus: "Biometric Machine",
    machineOnline: "Online & Synced",
    machineOffline: "Offline / Waiting",
    lastSynced: "Last Synced",
    syncNow: "Sync Machine Now",
    syncing: "Syncing...",
    
    // Live Attendance Table
    liveAttendanceTitle: "Live Attendance Feed",
    liveAttendanceSub: "Real-time in/out punches from ZKTeco biometric device",
    colStaff: "Staff Member",
    colBiometricPin: "Machine ID",
    colDepartment: "Department",
    colInTime: "Punch In",
    colOutTime: "Punch Out",
    colWorkedHours: "Work Hours",
    colStatus: "Status",
    colLateMin: "Late (Mins)",
    colActions: "Actions",

    // Statuses
    statusPresent: "Present",
    statusLate: "Late",
    statusHalfDay: "Half Day",
    statusAbsent: "Absent",
    statusOnLeave: "On Leave",
    statusHoliday: "Holiday",
    statusWeekend: "Weekend",

    // Staff Page
    staffDirectory: "Staff Directory",
    staffDirectorySub: "Manage 30+ team profiles, roles, salary, and biometric PINs",
    addNewStaff: "Add New Employee",
    searchStaffPlaceholder: "Search staff by name, email, or biometric PIN...",
    filterDepartment: "All Departments",
    colDesignation: "Designation",
    colJoinDate: "Join Date",
    colBaseSalary: "Base Salary",
    colRole: "System Role",

    // Attendance Page
    attendanceLogs: "Attendance Records",
    attendanceLogsSub: "Daily punch logs, shift analysis, and manual adjustments",
    selectDate: "Select Date",
    filterStatus: "All Statuses",
    exportExcel: "Export Excel",
    exportPdf: "Export PDF",
    manualCorrection: "Manual Attendance Entry",

    // Shifts
    shiftManagement: "Shift & Office Timings",
    shiftSub: "Configure work shifts, office start time, grace periods, and late penalty rules",
    shiftName: "Shift Name",
    startTime: "Start Time",
    endTime: "End Time",
    gracePeriod: "Grace Period (Minutes)",
    halfDayHours: "Half Day Cutoff",
    defaultShift: "Default Shift",

    // Leaves & Holidays
    leaveManagement: "Leave & Public Holidays",
    leaveSub: "Staff leave requests, approval workflow, and official Nepal calendar",
    applyLeave: "Apply For Leave",
    leaveBalance: "My Leave Balance",
    leaveHistory: "Leave Applications",
    nepalHolidays: "Nepal Public Holidays (2083 BS / 2026)",
    colLeaveType: "Leave Type",
    colDates: "Dates",
    colTotalDays: "Days",
    colReason: "Reason",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",

    // Payroll
    payrollTitle: "Payroll & Salary Processing",
    payrollSub: "Monthly salary generation, automated late deductions, overtime pay, and payslips",
    generatePayroll: "Calculate Month Payroll",
    advanceSalary: "Advance Salary",
    grossSalary: "Gross Earnings",
    deductions: "Total Deductions",
    netSalary: "Net Payable",
    generatePayslip: "View Payslip",
    sendWhatsApp: "Send via WhatsApp",
    downloadPdf: "Download PDF",

    // WhatsApp
    whatsappAlerts: "WhatsApp Meta Cloud Notifications",
    whatsappSub: "Automated daily 10 AM absent staff summary, late arrivals, and payslip alerts",
    testWhatsApp: "Send Test WhatsApp Alert",
    adminNumber: "Admin Phone Number",
    metaPhoneId: "Meta Phone Number ID",

    // Settings
    systemSettings: "System Configuration",
    hardwareSettings: "ZKTeco Biometric Machine",
    machineIp: "Machine LAN IP Address",
    machinePort: "Port (Default 4370)",
    saveSettings: "Save Configuration",

    // General
    loading: "Loading...",
    save: "Save Changes",
    cancel: "Cancel",
    confirm: "Confirm",
    success: "Operation Completed Successfully",
    error: "An error occurred. Please try again."
  },
  ne: {
    // App Brand
    appName: "गोइन्फी-एचआर",
    appSubTitle: "मानव संसाधन तथा हाजिरी प्रणाली",

    // Navigation
    navDashboard: "ड्यासबोर्ड",
    navStaff: "कर्मचारी व्यवस्थापन",
    navAttendance: "हाजिरी विवरण",
    navShifts: "सिफ्ट व्यवस्थापन",
    navLeaves: "बिदा तथा चाडपर्व",
    navPayroll: "तलब तथा पेरोल",
    navFieldDuty: "फिल्ड ड्युटी / WFH",
    navAssets: "सामान जिम्मा (Assets)",
    navPortal: "कर्मचारी पोर्टल (Portal)",
    navReports: "रिपोर्ट तथा तथ्याङ्क",
    navSettings: "सेटिङ्स र उपकरण",
    logout: "बाहिरिनुहोस्",

    // Roles
    roleAdmin: "प्रशासक (एडमिन)",
    roleHR: "एचआर म्यानेजर",
    roleEmployee: "कर्मचारी",

    // Dashboard Cards
    totalEmployees: "कुल कर्मचारी",
    presentToday: "आज उपस्थित",
    lateToday: "आज ढिलो",
    absentToday: "आज अनुपस्थित",
    onLeaveToday: "बिदामा रहेका",
    biometricStatus: "बायोमेट्रिक मेसिन",
    machineOnline: "सक्रिय तथा सिङ्क",
    machineOffline: "निष्क्रिय / पर्खाइमा",
    lastSynced: "पछिल्लो सिङ्क",
    syncNow: "मेसिन तुरुन्त सिङ्क गर्नुहोस्",
    syncing: "सिङ्क हुँदैछ...",

    // Live Attendance Table
    liveAttendanceTitle: "प्रत्यक्ष हाजिरी विवरण",
    liveAttendanceSub: "ZKTeco बायोमेट्रिक मेसिनबाट प्राप्त प्रत्यक्ष पञ्च रेकर्ड",
    colStaff: "कर्मचारीको नाम",
    colBiometricPin: "मेसिन आइडी",
    colDepartment: "विभाग",
    colInTime: "आएको समय (इन)",
    colOutTime: "गएको समय (आउट)",
    colWorkedHours: "काम गरेको घण्टा",
    colStatus: "अवस्था",
    colLateMin: "ढिलो (मिनेट)",
    colActions: "कार्यहरू",

    // Statuses
    statusPresent: "उपस्थित",
    statusLate: "ढिलो",
    statusHalfDay: "आधा दिन",
    statusAbsent: "अनुपस्थित",
    statusOnLeave: "बिदामा",
    statusHoliday: "सार्वजनिक बिदा",
    statusWeekend: "शनिबार बिदा",

    // Staff Page
    staffDirectory: "कर्मचारी सूची",
    staffDirectorySub: "३०+ कर्मचारीको विवरण, पद, तलब तथा बायोमेट्रिक पिन व्यवस्थापन",
    addNewStaff: "नयाँ कर्मचारी थप्नुहोस्",
    searchStaffPlaceholder: "कर्मचारीको नाम, इमेल वा बायोमेट्रिक पिन खोज्नुहोस्...",
    filterDepartment: "सबै विभागहरू",
    colDesignation: "पद",
    colJoinDate: "नियुक्ति मिति",
    colBaseSalary: "आधारभूत तलब",
    colRole: "प्रणाली पहुँच",

    // Attendance Page
    attendanceLogs: "दैनिक हाजिरी पुस्तिका",
    attendanceLogsSub: "दैनिक पञ्च विवरण, सिफ्ट विश्लेषण तथा म्यानुअल संशोधन",
    selectDate: "मिति छान्नुहोस्",
    filterStatus: "सबै अवस्था",
    exportExcel: "एक्सेल डाउनलोड",
    exportPdf: "पिडिएफ डाउनलोड",
    manualCorrection: "म्यानुअल हाजिरी दर्ता",

    // Shifts
    shiftManagement: "सिफ्ट तथा कार्यालय समय",
    shiftSub: "कार्यालय सुरु हुने समय, छुट मिनेट तथा ढिलो दण्ड नियमहरू",
    shiftName: "सिफ्टको नाम",
    startTime: "सुरु हुने समय",
    endTime: "सकिने समय",
    gracePeriod: "छुट समय (मिनेट)",
    halfDayHours: "आधा दिन समय",
    defaultShift: "पूर्वनिर्धारित सिफ्ट",

    // Leaves & Holidays
    leaveManagement: "बिदा तथा सार्वजनिक चाडपर्व",
    leaveSub: "कर्मचारी बिदा आवेदन, स्वीकृति प्रक्रिया तथा नेपालका सरकारी बिदाहरू",
    applyLeave: "बिदाको निवेदन दिनुहोस्",
    leaveBalance: "मेरो बाँकी बिदा",
    leaveHistory: "बिदा आवेदनहरू",
    nepalHolidays: "नेपालका सार्वजनिक बिदाहरू (२०८३)",
    colLeaveType: "बिदाको प्रकार",
    colDates: "मितिहरू",
    colTotalDays: "दिन",
    colReason: "कारण",
    approve: "स्वीकृत गर्नुहोस्",
    reject: "अस्वीकृत गर्नुहोस्",
    pending: "प्रतीक्षारत",

    // Payroll
    payrollTitle: "तलब तथा पेरोल व्यवस्थापन",
    payrollSub: "मासिक तलब गणना, ढिलो तथा अनुपस्थित कट्टी, ओभरटाइम र पेस्लिप",
    generatePayroll: "यस महिनाको तलब तयार गर्नुहोस्",
    advanceSalary: "अग्रिम तलब (एडभान्स)",
    grossSalary: "कुल आम्दानी",
    deductions: "कुल कट्टी रकम",
    netSalary: "पाउने खुद तलब",
    generatePayslip: "पेस्लिप हेर्नुहोस्",
    sendWhatsApp: "ह्वाट्सएपमा पठाउनुहोस्",
    downloadPdf: "पिडिएफ डाउनलोड",

    // WhatsApp
    whatsappAlerts: "ह्वाट्सएप क्लाउड नोटिफिकेसन",
    whatsappSub: "दैनिक १० बजेको अनुपस्थित सूची, ३० मिनेट ढिलो सूचना र तलब पेस्लिप",
    testWhatsApp: "परीक्षण मेसेज पठाउनुहोस्",
    adminNumber: "एडमिन ह्वाट्सएप नम्बर",
    metaPhoneId: "मेटा फोन नम्बर आइडी",

    // Settings
    systemSettings: "प्रणाली सेटिङ्स",
    hardwareSettings: "ZKTeco बायोमेट्रिक मेसिन",
    machineIp: "मेसिनको LAN आइपी ठेगाना",
    machinePort: "पोर्ट (पूर्वनिर्धारित ४३७०)",
    saveSettings: "सेटिङ्स सेभ गर्नुहोस्",

    // General
    loading: "लोड हुँदैछ...",
    save: "सुरक्षित गर्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    confirm: "निश्चित गर्नुहोस्",
    success: "कार्य सफलतापूर्वक सम्पन्न भयो",
    error: "त्रुटि देखा पर्यो। कृपया पुनः प्रयास गर्नुहोस्।"
  }
};
