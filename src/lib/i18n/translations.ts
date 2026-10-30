export type Language = 'en' | 'ne';

export const translations = {
  en: {
    // App Brand
    appName: "AP1 HRMS",
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
    staffDirectorySub: "Manage team profiles, roles, salary, and biometric PINs",
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
    whatsappSub: "Automated daily absent staff summary, late arrivals, and payslip alerts",
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
    appName: "एपी वान एचआरएमएस",
    appSubTitle: "मानव संसाधन तथा हाजिरी प्रणाली",
    
    // Navigation
    navDashboard: "ड्यासबोर्ड",
    navStaff: "कर्मचारी",
    navAttendance: "हाजिरी लगहरू",
    navShifts: "सिफ्ट व्यवस्थापन",
    navLeaves: "बिदा तथा चाडपर्व",
    navPayroll: "तलब तथा पे-स्लिप",
    navFieldDuty: "फिल्ड ड्युटी / WFH",
    navAssets: "सम्पत्ति ट्र्याकिङ",
    navPortal: "कर्मचारी पोर्टल",
    navReports: "रिपोर्ट तथा विश्लेषण",
    navSettings: "सेटिङ तथा हार्डवेयर",
    logout: "लगआउट",
    
    // Roles
    roleAdmin: "प्रशासक",
    roleHR: "एचआर प्रबन्धक",
    roleEmployee: "कर्मचारी",
    
    // Dashboard Cards
    totalEmployees: "कुल कर्मचारी",
    presentToday: "आज उपस्थित",
    lateToday: "ढिलो उपस्थित",
    absentToday: "आज अनुपस्थित",
    onLeaveToday: "बिदामा रहेका",
    biometricStatus: "बायोमेट्रिक मेसिन",
    machineOnline: "अनलाइन / सिङ्क",
    machineOffline: "अफलाइन / पर्खाइमा",
    lastSynced: "पछिल्लो सिङ्क",
    syncNow: "मेसिन सिङ्क गर्नुहोस्",
    syncing: "सिङ्क हुँदैछ...",
    
    // Live Attendance Table
    liveAttendanceTitle: "प्रत्यक्ष हाजिरी विवरण",
    liveAttendanceSub: "ZKTeco बायोमेट्रिक मेसिनबाट वास्तविक समयको आगमन/प्रस्थान",
    colStaff: "कर्मचारी",
    colBiometricPin: "बायोमेट्रिक PIN",
    colDepartment: "विभाग",
    colInTime: "आगमन समय",
    colOutTime: "प्रस्थान समय",
    colWorkedHours: "काम गरेको घण्टा",
    colStatus: "स्थिति",
    colLateMin: "ढिलो (मिनेट)",
    colActions: "कार्यहरू",

    // Statuses
    statusPresent: "उपस्थित",
    statusLate: "ढिलो",
    statusHalfDay: "आधा दिन",
    statusAbsent: "अनुपस्थित",
    statusOnLeave: "बिदामा",
    statusHoliday: "सार्वजनिक बिदा",
    statusWeekend: "साप्ताहिक बिदा",

    // Staff Page
    staffDirectory: "कर्मचारी निर्देशिका",
    staffDirectorySub: "सम्पूर्ण कर्मचारीहरूको प्रोफाइल, पद, तलब र बायोमेट्रिक PIN व्यवस्थापन",
    addNewStaff: "नयाँ कर्मचारी थप्नुहोस्",
    searchStaffPlaceholder: "नाम, इमेल वा बायोमेट्रिक PIN खोज्नुहोस्...",
    filterDepartment: "सबै विभागहरू",
    colDesignation: "पद",
    colJoinDate: "नियुक्ति मिति",
    colBaseSalary: "आधारभूत तलब",
    colRole: "प्रणाली भूमिका",

    // Attendance Page
    attendanceLogs: "हाजिरी रेकर्डहरू",
    attendanceLogsSub: "दैनिक हाजिरी, सिफ्ट विश्लेषण र म्यानुअल हाजिरी समायोजन",
    selectDate: "मिति छान्नुहोस्",
    filterStatus: "सबै स्थिति",
    exportExcel: "Excel डाउनलोड",
    exportPdf: "PDF डाउनलोड",
    manualCorrection: "म्यानुअल हाजिरी प्रविष्टि",

    // Shifts
    shiftManagement: "सिफ्ट तथा कार्य समय",
    shiftSub: "कार्य सिफ्ट, कार्यालय समय, ग्रेस पिरियड र ढिलाइ नियमहरू",
    shiftName: "सिफ्टको नाम",
    startTime: "सुरु समय",
    endTime: "समाप्त समय",
    gracePeriod: "ग्रेस पिरियड (मिनेट)",
    halfDayHours: "आधा दिन समय",
    defaultShift: "पूर्वनिर्धारित सिफ्ट",

    // Leaves & Holidays
    leaveManagement: "बिदा तथा सार्वजनिक बिदा",
    leaveSub: "कर्मचारी बिदा निवेदन, स्वीकृति प्रक्रिया र नेपालको आधिकारिक क्यालेन्डर",
    applyLeave: "बिदाको लागि निवेदन",
    leaveBalance: "मेरो बिदा मौज्दात",
    leaveHistory: "बिदाका निवेदनहरू",
    nepalHolidays: "नेपाल सार्वजनिक बिदाहरू (२०८३ वि.सं. / २०२६)",
    colLeaveType: "बिदाको प्रकार",
    colDates: "मितिहरू",
    colTotalDays: "दिन",
    colReason: "कारण",
    approve: "स्वीकृत",
    reject: "अस्वीकृत",
    pending: "पर्खाइमा",

    // Payroll
    payrollTitle: "तलब तथा पे-स्लिप व्यवस्थापन",
    payrollSub: "मासिक तलब गणना, ढिलाइ कट्टी, ओभरटाइम र आधिकारिक पे-स्लिप",
    generatePayroll: "मासिक तलब गणना गर्नुहोस्",
    advanceSalary: "पेश्की तलब",
    grossSalary: "कुल आम्दानी",
    deductions: "कुल कट्टी",
    netSalary: "खुद भुक्तानी",
    generatePayslip: "पे-स्लिप हेर्नुहोस्",
    sendWhatsApp: "WhatsApp मा पठाउनुहोस्",
    downloadPdf: "PDF डाउनलोड",

    // WhatsApp
    whatsappAlerts: "WhatsApp सूचना अलर्ट",
    whatsappSub: "दैनिक अनुपस्थित कर्मचारी, ढिलाइ र पे-स्लिप स्वतः WhatsApp अलर्ट",
    testWhatsApp: "परीक्षण WhatsApp पठाउनुहोस्",
    adminNumber: "प्रशासक फोन नम्बर",
    metaPhoneId: "मेटा फोन ID",

    // Settings
    systemSettings: "प्रणाली सेटिङ",
    hardwareSettings: "ZKTeco बायोमेट्रिक मेसिन",
    machineIp: "मेसिन IP ठेगाना",
    machinePort: "पोर्ट (पूर्वनिर्धारित ४३७०)",
    saveSettings: "सेटिङ सुरक्षित गर्नुहोस्",

    // General
    loading: "लोड हुँदैछ...",
    save: "परिवर्तन सेभ गर्नुहोस्",
    cancel: "रद्द गर्नुहोस्",
    confirm: "पुष्टि गर्नुहोस्",
    success: "कार्य सफलतापूर्वक सम्पन्न भयो",
    error: "त्रुटि भयो। कृपया पुनः प्रयास गर्नुहोस्।"
  }
};
