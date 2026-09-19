import { Employee, Department, Shift, DailyAttendance, PublicHoliday, LeaveRequest, AdvanceSalary, PayrollRecord, SystemSettings, FieldDutyRequest, CompanyAsset } from './types';

export const initialDepartments: Department[] = [
  { id: 'dept-1', name: 'Executive Management', code: 'EXEC', description: 'C-Suite and executive direction', employee_count: 0 },
  { id: 'dept-6', name: 'Operations & Broadcasting', code: 'OB', description: 'Master control, transmission, and broadcast operations', employee_count: 0 },
  { id: 'dept-2', name: 'News & Current Affairs', code: 'NEWS', description: 'AP1 Newsroom, reporting, and bulletin desk', employee_count: 0 },
  { id: 'dept-3', name: 'Broadcast Engineering & IT', code: 'ENG', description: 'Transmission, PCR, MCR, and IT networks', employee_count: 0 },
  { id: 'dept-4', name: 'Program & Production', code: 'PROD', description: 'Studio shoots, shows, and video production', employee_count: 0 },
  { id: 'dept-5', name: 'Camera & Lighting', code: 'CAM', description: 'Outdoor broadcast and studio camera operations', employee_count: 0 },
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
    id: 'shift-1',
    name: 'Regular Morning Shift (9 AM - 5 PM)',
    start_time: '09:00:00',
    end_time: '17:00:00',
    grace_period_minutes: 15,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: true
  },
  {
    id: 'shift-2',
    name: 'Flexible Tech Shift (10 AM - 6 PM)',
    start_time: '10:00:00',
    end_time: '18:00:00',
    grace_period_minutes: 20,
    half_day_threshold_hours: 4.0,
    full_day_hours: 8.0,
    is_default: false
  }
];

export const initialEmployees: Employee[] = [];

export const initialHolidays: PublicHoliday[] = [];

export const initialSettings: SystemSettings = {
  id: 'sys-1',
  company_name: 'Goinfi Technologies Pvt. Ltd.',
  company_address: 'Baneshwor, Kathmandu, Nepal',
  company_phone: '+977-1-4498765',
  company_email: 'contact@goinfi.com',
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
  late_penalty_rule: 'three_late_half_day',
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

export const initialFieldDutyRequests: FieldDutyRequest[] = [
  {
    id: 'fdr-1',
    employee_id: 'emp-104',
    employee_name: 'Samikshya Gautam',
    employee_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    department_name: 'Software Engineering',
    type: 'CLIENT_MEETING',
    start_date: '2026-09-16',
    end_date: '2026-09-16',
    location: 'Nabil Bank Head Office, Teendhara, Kathmandu',
    purpose: 'Core Banking API Integration & UAT Deployment',
    status: 'approved',
    applied_at: '2026-09-15T16:20:00Z',
    approved_by: 'Aayush Shrestha',
    remarks: 'Approved for full-day on-site client deployment'
  },
  {
    id: 'fdr-2',
    employee_id: 'emp-107',
    employee_name: 'Manoj Basnet',
    employee_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    department_name: 'Software Engineering',
    type: 'WORK_FROM_HOME',
    start_date: '2026-09-17',
    end_date: '2026-09-17',
    location: 'Home (Bhaktapur)',
    purpose: 'Post-release overnight server patch monitoring',
    status: 'pending',
    applied_at: '2026-09-16T11:00:00Z'
  },
  {
    id: 'fdr-3',
    employee_id: 'emp-114',
    employee_name: 'Suman Shrestha',
    employee_photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    department_name: 'Digital Marketing',
    type: 'FIELD_VISIT',
    start_date: '2026-09-18',
    end_date: '2026-09-19',
    location: 'Pokhara Event Center',
    purpose: 'Client video shoot & expo brand sponsorship coverage',
    status: 'approved',
    applied_at: '2026-09-14T09:30:00Z',
    approved_by: 'Pooja Thapa',
    remarks: 'Approved with travel allowance'
  }
];

export const initialAssets: CompanyAsset[] = [];


