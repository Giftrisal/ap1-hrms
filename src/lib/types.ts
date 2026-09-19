export type UserRole = 'admin' | 'hr' | 'employee';

export type AttendanceStatus = 
  | 'PRESENT' 
  | 'LATE' 
  | 'HALF_DAY' 
  | 'ABSENT' 
  | 'ON_LEAVE' 
  | 'HOLIDAY' 
  | 'WEEKEND';

export interface Employee {
  id: string;
  biometric_pin: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url?: string;
  department_id: string;
  department_name?: string;
  shift_id: string;
  shift_name?: string;
  designation: string;
  role: UserRole;
  status: 'active' | 'on_leave' | 'resigned' | 'terminated';
  join_date: string;
  dob?: string; // YYYY-MM-DD
  base_salary: number;
  bank_name?: string;
  bank_account_number?: string;
  pan_number?: string;
  emergency_contact?: string;
  created_at?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  employee_count?: number;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string; // "09:00:00"
  end_time: string;   // "17:00:00"
  grace_period_minutes: number;
  half_day_threshold_hours: number;
  full_day_hours: number;
  is_default: boolean;
}

export interface DailyAttendance {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_pin?: string;
  employee_photo?: string;
  department_name?: string;
  designation?: string;
  date: string; // "YYYY-MM-DD"
  in_time?: string; // ISO string
  out_time?: string; // ISO string
  status: AttendanceStatus;
  late_minutes: number;
  early_exit_minutes: number;
  overtime_minutes: number;
  worked_hours: number;
  remarks?: string;
  source: string;
}

export interface BiometricLog {
  id: string;
  biometric_pin: string;
  punch_time: string;
  punch_type: number; // 0=In, 1=Out
  verify_type: number;
  device_ip: string;
  synced_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID';
  annual_days: number;
  is_paid: boolean;
  description?: string;
}

export interface LeaveAllocation {
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type_name?: string;
  year: number;
  allocated_days: number;
  used_days: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  department_name?: string;
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  days_count?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  applied_at: string;
}

export interface PublicHoliday {
  id: string;
  name: string;
  name_np: string;
  holiday_date: string;
  nepali_date: string;
  description?: string;
  is_gazetted: boolean;
}

export interface AdvanceSalary {
  id: string;
  employee_id: string;
  employee_name?: string;
  amount: number;
  request_date: string;
  repayment_months: number;
  monthly_deduction: number;
  repaid_amount: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_designation?: string;
  department_name?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  year: number;
  month: number;
  base_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  overtime_hours: number;
  overtime_pay: number;
  allowances: number;
  late_deduction: number;
  absent_deduction: number;
  unpaid_leave_deduction: number;
  advance_deduction: number;
  tax_deduction: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  paid_date?: string;
  payment_method?: string;
  whatsapp_sent_at?: string;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  biometric_device_ip: string;
  biometric_device_port: number;
  biometric_last_sync?: string;
  biometric_sync_status?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_admin_phone: string;
  whatsapp_auto_10am_alert: boolean;
  whatsapp_late_alert_threshold: number;
  nepali_fiscal_year: string;
  late_penalty_rule: 'three_late_half_day' | 'per_minute' | 'fixed_amount';
  late_penalty_amount: number;
}

export type FieldDutyType = 'FIELD_VISIT' | 'WORK_FROM_HOME' | 'CLIENT_MEETING' | 'OFFICIAL_TOUR';

export interface FieldDutyRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_photo?: string;
  department_name?: string;
  type: FieldDutyType;
  start_date: string;
  end_date: string;
  location: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  approved_by?: string;
  remarks?: string;
}

export type AssetCategory = 
  | 'Laptop' 
  | 'Desktop' 
  | 'Mobile / SIM' 
  | 'Vehicle' 
  | 'Office Access / Key' 
  | 'Equipment' 
  | 'Camera' 
  | 'Memory Card' 
  | 'SSD / HDD' 
  | string;

export interface CompanyAsset {
  id: string;
  name: string;
  asset_code: string;
  category: AssetCategory;
  serial_number?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  assigned_to_photo?: string;
  department_name?: string;
  assigned_date?: string;
  condition: 'Brand New' | 'Good' | 'Fair' | 'Under Repair' | 'Damaged';
  status: 'Assigned' | 'Available' | 'Maintenance' | 'Retired';
  purchase_date?: string;
  purchase_cost?: number;
  notes?: string;
}

