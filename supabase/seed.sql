-- ==============================================================================
-- GOINFI-HR: Seed Data
-- 30+ Realistic Staff Profiles, Nepal Public Holidays, Shifts, Leave Types
-- ==============================================================================

-- 1. Insert Default Settings
INSERT INTO system_settings (
    company_name, company_address, company_phone, company_email,
    biometric_device_ip, biometric_device_port, whatsapp_admin_phone,
    late_penalty_rule
) VALUES (
    'Goinfi Technologies Pvt. Ltd.',
    'Baneshwor, Kathmandu, Nepal',
    '+977-1-4498765',
    'contact@goinfi.com',
    '192.168.1.201',
    4370,
    '9779841234567',
    'three_late_half_day'
) ON CONFLICT DO NOTHING;

-- 2. Insert Shifts
INSERT INTO shifts (id, name, start_time, end_time, grace_period_minutes, half_day_threshold_hours, full_day_hours, is_default)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Regular Morning Shift', '09:00:00', '17:00:00', 15, 4.0, 8.0, true),
('22222222-2222-2222-2222-222222222222', 'Flexible Day Shift', '10:00:00', '18:00:00', 20, 4.0, 8.0, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Departments
INSERT INTO departments (id, name, code, description)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'Executive Management', 'EXEC', 'C-Suite and executive direction'),
('a2222222-2222-2222-2222-222222222222', 'Software Engineering', 'ENG', 'Full-stack, Mobile, and DevOps engineering'),
('a3333333-3333-3333-3333-333333333333', 'Digital Marketing', 'MKT', 'SEO, Social Media, and Branding'),
('a4444444-4444-4444-4444-444444444444', 'Human Resources', 'HR', 'People Operations and Talent Acquisition'),
('a5555555-5555-5555-5555-555555555555', 'Finance & Accounting', 'FIN', 'Payroll, Auditing, and Bookkeeping'),
('a6666666-6666-6666-6666-666666666666', 'Client Support & Operations', 'OPS', 'Customer satisfaction and technical support'),
('a7777777-7777-7777-7777-777777777777', 'UI/UX & Creative Design', 'DSN', 'Product design, graphics, and video production')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Leave Types
INSERT INTO leave_types (id, name, code, annual_days, is_paid, description)
VALUES 
('b1111111-1111-1111-1111-111111111111', 'Casual Leave', 'CASUAL', 12, true, 'Short term personal leave'),
('b2222222-2222-2222-2222-222222222222', 'Sick Leave', 'SICK', 12, true, 'Medical illness leave with certificate'),
('b3333333-3333-3333-3333-333333333333', 'Annual / Festival Leave', 'ANNUAL', 14, true, 'Earned holiday / festival leaves'),
('b4444444-4444-4444-4444-444444444444', 'Unpaid Leave (LWP)', 'UNPAID', 0, false, 'Leave without pay deducted from salary')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert 32 Staff Profiles
INSERT INTO employees (
    biometric_pin, full_name, email, phone, photo_url, department_id, shift_id,
    designation, role, status, join_date, base_salary, pan_number, bank_name, bank_account_number
) VALUES 
('101', 'Aayush Shrestha', 'aayush.s@goinfi.com', '+977-9841100101', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Chief Executive Officer', 'admin', 'active', '2022-01-01', 125000.00, 'PAN60129381', 'NIC Asia Bank', '10928374829101'),
('102', 'Pooja Thapa', 'pooja.t@goinfi.com', '+977-9841100102', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'HR Manager', 'hr', 'active', '2022-03-15', 75000.00, 'PAN60291039', 'Nabil Bank', '02198301928301'),
('103', 'Bibek Sharma', 'bibek.s@goinfi.com', '+977-9841100103', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Lead Software Architect', 'admin', 'active', '2022-02-01', 95000.00, 'PAN60391823', 'Global IME Bank', '30192839102910'),
('104', 'Samikshya Gautam', 'samikshya.g@goinfi.com', '+977-9841100104', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Senior Full Stack Engineer', 'employee', 'active', '2022-06-10', 80000.00, 'PAN60492817', 'Siddhartha Bank', '49102938102910'),
('105', 'Rohan Karki', 'rohan.k@goinfi.com', '+977-9841100105', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Frontend Developer (React/Next)', 'employee', 'active', '2023-01-15', 55000.00, 'PAN60581920', 'Sanima Bank', '58192039102910'),
('106', 'Anupama Joshi', 'anupama.j@goinfi.com', '+977-9841100106', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Backend Developer (Node/Python)', 'employee', 'active', '2023-02-01', 58000.00, 'PAN60691820', 'Prabhu Bank', '69182039102910'),
('107', 'Kiran Maharjan', 'kiran.m@goinfi.com', '+977-9841100107', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Mobile App Developer (Flutter)', 'employee', 'active', '2023-04-12', 60000.00, 'PAN60791820', 'Everest Bank', '79182039102910'),
('108', 'Sneha Adhikari', 'sneha.a@goinfi.com', '+977-9841100108', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Senior UI/UX Designer', 'employee', 'active', '2022-09-01', 65000.00, 'PAN60891820', 'NIC Asia Bank', '89182039102910'),
('109', 'Niraj Basnet', 'niraj.b@goinfi.com', '+977-9841100109', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Digital Marketing Lead', 'employee', 'active', '2022-11-15', 62000.00, 'PAN60991820', 'Nabil Bank', '99182039102910'),
('110', 'Pratima Rai', 'pratima.r@goinfi.com', '+977-9841100110', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150', 'a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Social Media Strategist', 'employee', 'active', '2023-05-20', 42000.00, 'PAN61091820', 'Global IME Bank', '10991820391029'),
('111', 'Dipesh KC', 'dipesh.kc@goinfi.com', '+977-9841100111', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', 'a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Senior Accountant', 'hr', 'active', '2022-05-01', 58000.00, 'PAN61191820', 'Siddhartha Bank', '11991820391029'),
('112', 'Srijana Poudel', 'srijana.p@goinfi.com', '+977-9841100112', 'https://images.unsplash.com/photo-1534751516642-a171edd27218?w=150', 'a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'HR & Culture Executive', 'hr', 'active', '2023-07-01', 45000.00, 'PAN61291820', 'Sanima Bank', '12991820391029'),
('113', 'Bishal Tamang', 'bishal.t@goinfi.com', '+977-9841100113', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Operations Specialist', 'employee', 'active', '2023-03-10', 40000.00, 'PAN61391820', 'Prabhu Bank', '13991820391029'),
('114', 'Ritu Bhattarai', 'ritu.b@goinfi.com', '+977-9841100114', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', 'a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Customer Support Associate', 'employee', 'active', '2023-08-15', 36000.00, 'PAN61491820', 'Everest Bank', '14991820391029'),
('115', 'Suman Dahal', 'suman.d@goinfi.com', '+977-9841100115', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'QA & Automation Engineer', 'employee', 'active', '2023-09-01', 52000.00, 'PAN61591820', 'NIC Asia Bank', '15991820391029'),
('116', 'Kavita Acharya', 'kavita.a@goinfi.com', '+977-9841100116', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', 'a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Graphic & Motion Designer', 'employee', 'active', '2023-10-10', 48000.00, 'PAN61691820', 'Nabil Bank', '16991820391029'),
('117', 'Manish Gurung', 'manish.g@goinfi.com', '+977-9841100117', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'DevOps & Cloud Engineer', 'employee', 'active', '2023-06-01', 72000.00, 'PAN61791820', 'Global IME Bank', '17991820391029'),
('118', 'Sarita Rimal', 'sarita.r@goinfi.com', '+977-9841100118', 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150', 'a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Content Writer & Copywriter', 'employee', 'active', '2023-11-01', 38000.00, 'PAN61891820', 'Siddhartha Bank', '18991820391029'),
('119', 'Aakash Tripathi', 'aakash.t@goinfi.com', '+977-9841100119', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Junior Web Developer', 'employee', 'active', '2024-01-05', 35000.00, 'PAN61991820', 'Sanima Bank', '19991820391029'),
('120', 'Binita Magar', 'binita.m@goinfi.com', '+977-9841100120', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Office Administrator', 'employee', 'active', '2023-01-20', 32000.00, 'PAN62091820', 'Prabhu Bank', '20991820391029'),
('121', 'Prakash Neupane', 'prakash.n@goinfi.com', '+977-9841100121', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150', 'a5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Junior Accountant', 'employee', 'active', '2024-02-15', 34000.00, 'PAN62191820', 'Everest Bank', '21991820391029'),
('122', 'Sweta Shakya', 'sweta.s@goinfi.com', '+977-9841100122', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150', 'a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'SEO Analyst', 'employee', 'active', '2024-03-01', 37000.00, 'PAN62291820', 'NIC Asia Bank', '22991820391029'),
('123', 'Rajeev Khadka', 'rajeev.k@goinfi.com', '+977-9841100123', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Full Stack Developer', 'employee', 'active', '2023-12-01', 54000.00, 'PAN62391820', 'Nabil Bank', '23991820391029'),
('124', 'Alina Baral', 'alina.b@goinfi.com', '+977-9841100124', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150', 'a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'UI Designer', 'employee', 'active', '2024-04-10', 44000.00, 'PAN62491820', 'Global IME Bank', '24991820391029'),
('125', 'Sandesh Tiwari', 'sandesh.t@goinfi.com', '+977-9841100125', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'IT Support Technician', 'employee', 'active', '2023-10-25', 35000.00, 'PAN62591820', 'Siddhartha Bank', '25991820391029'),
('126', 'Deepa Subedi', 'deepa.s@goinfi.com', '+977-9841100126', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'a4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Recruitment Specialist', 'hr', 'active', '2024-01-10', 42000.00, 'PAN62691820', 'Sanima Bank', '26991820391029'),
('127', 'Bikash Chaudhary', 'bikash.c@goinfi.com', '+977-9841100127', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Database Administrator', 'employee', 'active', '2023-05-15', 68000.00, 'PAN62791820', 'Prabhu Bank', '27991820391029'),
('128', 'Puja Bhandari', 'puja.b@goinfi.com', '+977-9841100128', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Performance Marketer', 'employee', 'active', '2024-02-01', 46000.00, 'PAN62891820', 'Everest Bank', '28991820391029'),
('129', 'Roshan Ghimire', 'roshan.g@goinfi.com', '+977-9841100129', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Cybersecurity Analyst', 'employee', 'active', '2023-11-20', 70000.00, 'PAN62991820', 'NIC Asia Bank', '29991820391029'),
('130', 'Kritika Shrestha', 'kritika.s@goinfi.com', '+977-9841100130', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'a7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Illustrator & Visual Artist', 'employee', 'active', '2024-05-01', 40000.00, 'PAN63091820', 'Nabil Bank', '30991820391029'),
('131', 'Gaurav Pandey', 'gaurav.p@goinfi.com', '+977-9841100131', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'a6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Facility & Logistics Officer', 'employee', 'active', '2023-04-05', 33000.00, 'PAN63191820', 'Global IME Bank', '31991820391029'),
('132', 'Isha Regmi', 'isha.r@goinfi.com', '+977-9841100132', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'API & Integration Specialist', 'employee', 'active', '2024-03-15', 56000.00, 'PAN63291820', 'Siddhartha Bank', '32991820391029')
ON CONFLICT (biometric_pin) DO NOTHING;

-- 6. Insert Official Nepal Public Holidays
INSERT INTO public_holidays (name, name_np, holiday_date, nepali_date, description)
VALUES 
('Nepali New Year', 'नयाँ वर्ष', '2026-04-14', '२०८३ बैशाख ०१', 'First day of Bikram Sambat 2083'),
('Buddha Jayanti', 'बुद्ध जयन्ती', '2026-05-12', '२०८३ बैशाख २९', 'Birth anniversary of Lord Gautama Buddha'),
('Republic Day', 'गणतन्त्र दिवस', '2026-05-29', '२०८३ जेठ १५', 'National Republic Day of Nepal'),
('Gai Jatra', 'गाई जात्रा', '2026-08-28', '२०८३ भाद्र १२', 'Festival of cows honoring ancestors'),
('Constitution Day', 'संविधान दिवस', '2026-09-19', '२०८३ असोज ०३', 'National Day of the Constitution of Nepal'),
('Ghatasthapana', 'घटस्थापना', '2026-10-10', '२०८३ असोज २४', 'First day of Dashain festival'),
('Bijaya Dashami', 'विजया दशमी', '2026-10-19', '२०८३ कात्तिक ०२', 'Main Dashain Day (Tika & Jamara)'),
('Ekadashi to Purnima', 'दशैं बिदा', '2026-10-20', '२०८३ कात्तिक ०३', 'Dashain festival continuation'),
('Laxmi Puja (Tihar)', 'लक्ष्मी पूजा', '2026-11-08', '२०८३ कात्तिक २२', 'Festival of lights worshiping Goddess Laxmi'),
('Bhai Tika', 'भाइटीका', '2026-11-10', '२०८३ कात्तिक २४', 'Tihar final day celebrating brother-sister bond'),
('Prithvi Jayanti', 'पृथ्वी जयन्ती', '2027-01-11', '२०८३ पुस २७', 'National Unity Day'),
('Maha Shivaratri', 'महा शिवरात्रि', '2027-03-07', '२०८३ फागुन २३', 'Grand celebration of Lord Shiva at Pashupatinath'),
('Holi (Fagu Purnima)', 'फागु पूर्णिमा', '2027-03-22', '२०८३ चैत ०८', 'Festival of colors in Kathmandu valley')
ON CONFLICT (holiday_date) DO NOTHING;

-- 7. Initialize Leave Allocations for all employees (2026)
INSERT INTO leave_allocations (employee_id, leave_type_id, year, allocated_days, used_days)
SELECT e.id, lt.id, 2026, lt.annual_days, 
  CASE 
    WHEN lt.code = 'CASUAL' THEN FLOOR(RANDOM() * 3) 
    WHEN lt.code = 'SICK' THEN FLOOR(RANDOM() * 2) 
    ELSE 0 
  END
FROM employees e
CROSS JOIN leave_types lt
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
