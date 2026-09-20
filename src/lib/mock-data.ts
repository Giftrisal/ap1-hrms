import { Employee, Department, Shift, DailyAttendance, PublicHoliday, LeaveRequest, AdvanceSalary, PayrollRecord, SystemSettings, FieldDutyRequest, CompanyAsset, OvertimePermission } from './types';

export const initialDepartments: Department[] = [
  { id: 'dept-1', name: 'Executive Management', code: 'EXEC', description: 'C-Suite and executive direction', employee_count: 0 },
  { id: 'dept-6', name: 'Operations & Broadcasting', code: 'OB', description: 'Master control, transmission, and broadcast operations', employee_count: 0 },
  { id: 'dept-2', name: 'News & Current Affairs', code: 'NEWS', description: 'AP1 Newsroom, reporting, and bulletin desk', employee_count: 0 },
  { id: 'dept-3', name: 'Broadcast Engineering & IT', code: 'ENG', description: 'Transmission, PCR, MCR, and IT networks', employee_count: 0 },
  { id: 'dept-4', name: 'Program & Production', code: 'PROD', description: 'Studio shoots, shows, and video production', employee_count: 0 },
  { id: 'dept-5', name: 'Camera & Lighting', code: 'CAM', description: 'Outdoor broadcast and studio camera operations', employee_count: 0 },
  { id: 'dept-digital', name: 'Digital Media', code: 'DIGI', description: 'Social media, digital distribution, and online broadcasts', employee_count: 0 },
  { id: 'dept-mkt', name: 'Marketing & Sales', code: 'MKT', description: 'Advertising, sponsorships, and client partnerships', employee_count: 0 },
  { id: 'dept-7', name: 'Human Resources', code: 'HR', description: 'People operations, payroll, and talent acquisition', employee_count: 0 },
  { id: 'dept-8', name: 'Finance & Accounts', code: 'FIN', description: 'Billing, treasury, auditing, and tax compliance', employee_count: 0 },
  { id: 'dept-9', name: 'Software Engineering', code: 'TECH', description: 'Web, mobile, and digital platform development', employee_count: 0 },
];

export const getStoredDepartments = (): Department[] => {
  if (typeof window === 'undefined') return initialDepartments;
  try {
    const saved = localStorage.getItem('goinfi_departments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!parsed.some((d: any) => d.name === 'Operations & Broadcasting')) {
          parsed.splice(1, 0, { id: 'dept-6', name: 'Operations & Broadcasting', code: 'OB', description: 'Master control, transmission, and broadcast operations', employee_count: 0 });
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading departments:', e);
  }
  return initialDepartments;
};

export const saveStoredDepartments = (depts: Department[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('goinfi_departments', JSON.stringify(depts));
  } catch (e) {
    console.error('Error saving departments:', e);
  }
};


export const initialShifts: Shift[] = [
  {
    id: 'shift-morning',
    name: 'Morning Shift (6:00 AM - 2:00 PM)',
    start_time: '06:00:00',
    end_time: '14:00:00',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: false
  },
  {
    id: 'shift-day',
    name: 'Day Shift (10:00 AM - 6:00 PM)',
    start_time: '10:00:00',
    end_time: '18:00:00',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: true
  },
  {
    id: 'shift-evening',
    name: 'Evening Shift (2:00 PM - 10:00 PM)',
    start_time: '14:00:00',
    end_time: '22:00:00',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: false
  },
  {
    id: 'shift-flexible',
    name: 'Flexible Shift (No Fixed Shift / 24/7 Rotational)',
    start_time: '00:00:00',
    end_time: '23:59:59',
    grace_period_minutes: 60,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: false
  }
];

export const initialOvertimePermissions: OvertimePermission[] = [];

export const masterAdminUser: Employee = {
  id: "emp-master",
  biometric_pin: "999",
  full_name: "Master Administrator",
  email: "admin@ap1hdtv.com",
  phone: "9800000000",
  photo_url: "",
  department_id: "dept-1",
  department_name: "Executive Management",
  shift_id: "shift-day",
  shift_name: "Day Shift (10:00 AM - 6:00 PM)",
  designation: "Master Administrator / Station Head",
  role: "admin",
  status: "active",
  join_date: "2023-01-01",
  base_salary: 150000,
  is_master_admin: true
};

export const initialEmployees: Employee[] = [];

export const initialHolidays: PublicHoliday[] = [];

export const initialSettings: SystemSettings = {
  id: 'sys-1',
  company_name: 'AP1 Television',
  company_address: 'Kathmandu, Nepal',
  company_phone: '+977-1-4498765',
  company_email: 'contact@ap1hdtv.com',
  biometric_device_ip: '192.168.1.201',
  biometric_device_port: 4370,
  biometric_last_sync: new Date().toISOString(),
  biometric_sync_status: 'online',
  whatsapp_phone_number_id: '1092837491029',
  whatsapp_access_token: '',
  whatsapp_admin_phone: '9779841234567',
  whatsapp_auto_10am_alert: true,
  whatsapp_late_alert_threshold: 30,
  nepali_fiscal_year: '2082/2083',
  late_penalty_rule: 'monthly_hours_shortfall',
  late_penalty_amount: 500
};

// Generates today's attendance records from localStorage or empty for live machine punches
export function generateTodayAttendance(): DailyAttendance[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('goinfi_attendance_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
  }
  return [];
}

export const initialFieldDutyRequests: FieldDutyRequest[] = [];

export const initialAssets: CompanyAsset[] = [];


