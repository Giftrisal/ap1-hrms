-- ==============================================================================
-- GOINFI-HR: Professional HR & Attendance Management System Schema
-- Compatible with Supabase PostgreSQL
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Company & System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) DEFAULT 'Goinfi Technologies Pvt. Ltd.',
    company_address TEXT DEFAULT 'Kathmandu, Nepal',
    company_phone VARCHAR(50) DEFAULT '+977-9800000000',
    company_email VARCHAR(100) DEFAULT 'hr@goinfi.com',
    biometric_device_ip VARCHAR(50) DEFAULT '192.168.1.201',
    biometric_device_port INT DEFAULT 4370,
    biometric_last_sync TIMESTAMPTZ,
    biometric_sync_status VARCHAR(50) DEFAULT 'idle',
    whatsapp_phone_number_id VARCHAR(100),
    whatsapp_access_token TEXT,
    whatsapp_admin_phone VARCHAR(50) DEFAULT '9779800000000',
    whatsapp_auto_10am_alert BOOLEAN DEFAULT true,
    whatsapp_late_alert_threshold INT DEFAULT 30, -- minutes
    nepali_fiscal_year VARCHAR(20) DEFAULT '2082/2083',
    late_penalty_rule VARCHAR(50) DEFAULT 'three_late_half_day',
    late_penalty_amount DECIMAL(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Work Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL DEFAULT '09:00:00',
    end_time TIME NOT NULL DEFAULT '17:00:00',
    grace_period_minutes INT DEFAULT 15,
    half_day_threshold_hours DECIMAL(4, 2) DEFAULT 4.0,
    full_day_hours DECIMAL(4, 2) DEFAULT 8.0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Employees / Staff (30+ Profiles)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    biometric_pin VARCHAR(50) UNIQUE NOT NULL, -- ZKTeco User ID / PIN
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(50),
    photo_url TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    designation VARCHAR(100) NOT NULL,
    role VARCHAR(30) DEFAULT 'employee', -- 'admin', 'hr', 'employee'
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'on_leave', 'resigned', 'terminated'
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_salary DECIMAL(12, 2) NOT NULL DEFAULT 35000.00,
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(100),
    pan_number VARCHAR(50),
    emergency_contact VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Raw Biometric Punches from ZKTeco LAN Machine
CREATE TABLE IF NOT EXISTS biometric_raw_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    biometric_pin VARCHAR(50) NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type INT DEFAULT 0, -- 0: Check In, 1: Check Out, 2: Break Out, 3: Break In, 4: OT In, 5: OT Out
    verify_type INT DEFAULT 1, -- 1: Fingerprint, 20: Face, 15: Password
    device_ip VARCHAR(50),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false,
    CONSTRAINT unique_pin_punch UNIQUE (biometric_pin, punch_time)
);

-- 6. Normalized Daily Attendance Records
CREATE TABLE IF NOT EXISTS daily_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    in_time TIMESTAMPTZ,
    out_time TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ABSENT', -- PRESENT, LATE, HALF_DAY, ABSENT, ON_LEAVE, HOLIDAY, WEEKEND
    late_minutes INT DEFAULT 0,
    early_exit_minutes INT DEFAULT 0,
    overtime_minutes INT DEFAULT 0,
    worked_hours DECIMAL(5, 2) DEFAULT 0.00,
    remarks TEXT,
    source VARCHAR(50) DEFAULT 'ZKTeco_LAN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_emp_date UNIQUE (employee_id, date)
);

-- 7. Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    annual_days INT NOT NULL DEFAULT 12,
    is_paid BOOLEAN DEFAULT true,
    description TEXT
);

-- 8. Leave Allocations
CREATE TABLE IF NOT EXISTS leave_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL DEFAULT 2026,
    allocated_days INT NOT NULL,
    used_days DECIMAL(4, 1) DEFAULT 0.0,
    CONSTRAINT unique_emp_leave_year UNIQUE (employee_id, leave_type_id, year)
);

-- 9. Leave Applications
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4, 1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Nepal Public Holidays Calendar
CREATE TABLE IF NOT EXISTS public_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    name_np VARCHAR(150),
    holiday_date DATE NOT NULL UNIQUE,
    nepali_date VARCHAR(50),
    description TEXT,
    is_gazetted BOOLEAN DEFAULT true
);

-- 11. Advance Salary Records
CREATE TABLE IF NOT EXISTS advance_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    repayment_months INT DEFAULT 1,
    monthly_deduction DECIMAL(10, 2) NOT NULL,
    repaid_amount DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'approved',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Payroll Records
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INT NOT NULL,
    month INT NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    working_days INT NOT NULL DEFAULT 26,
    present_days DECIMAL(4, 1) NOT NULL DEFAULT 26,
    absent_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    late_days INT NOT NULL DEFAULT 0,
    paid_leave_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    unpaid_leave_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0.0,
    overtime_pay DECIMAL(10, 2) DEFAULT 0.00,
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    late_deduction DECIMAL(10, 2) DEFAULT 0.00,
    absent_deduction DECIMAL(10, 2) DEFAULT 0.00,
    unpaid_leave_deduction DECIMAL(10, 2) DEFAULT 0.00,
    advance_deduction DECIMAL(10, 2) DEFAULT 0.00,
    tax_deduction DECIMAL(10, 2) DEFAULT 0.00,
    net_salary DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    paid_date DATE,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    payslip_generated_at TIMESTAMPTZ,
    whatsapp_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_emp_month_year UNIQUE (employee_id, month, year)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_biometric_logs_pin_time ON biometric_raw_logs(biometric_pin, punch_time);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_emp_date ON daily_attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employees_pin ON employees(biometric_pin);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
