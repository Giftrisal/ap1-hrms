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
  }
};

// Pure English interface across the platform
(translations as any).ne = translations.en;
