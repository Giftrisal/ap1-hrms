import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

// Centralized staff store (shared across desktop, mobile portal, tablets)
let staffDatabase: any[] = [
  {
    id: "emp-1",
    biometric_pin: "1",
    full_name: "Gift",
    employee_code: "AP1-001",
    department_id: "dept-6",
    department_name: "Operations & Broadcasting",
    shift_id: "shift-1",
    shift_name: "Regular Morning Shift (9 AM - 5 PM)",
    designation: "HRMS Manager",
    phone: "9705355569",
    email: "gift@ap1hdtv.com",
    role: "admin",
    status: "active",
    join_date: "2024-01-01",
    base_salary: 85000,
    monthly_salary: 85000,
    photo_url: ""
  }
];

// Centralized portal registrations & approval requests
let registrationsDatabase: any[] = [
  {
    pin: "1",
    phone: "9705355569",
    staffName: "Gift",
    department_name: "Operations & Broadcasting",
    designation: "HRMS Manager",
    registeredAt: "2024-01-01T00:00:00.000Z",
    status: "APPROVED",
    approvedBy: "System SuperAdmin",
    approvedAt: "2024-01-01T00:00:00.000Z"
  }
];

export async function GET() {
  const pendingCount = registrationsDatabase.filter(r => r.status === 'PENDING_APPROVAL').length;
  return NextResponse.json(
    {
      success: true,
      count: staffDatabase.length,
      staff: staffDatabase,
      registrations: registrationsDatabase,
      pending_count: pendingCount
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      }
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Submit Registration from Staff Portal (Awaiting Admin Approval)
    if (body.action === 'submit_registration' && body.registration) {
      const reg = body.registration;
      const cleanPin = String(reg.pin).trim();
      
      const existingIdx = registrationsDatabase.findIndex(r => String(r.pin) === cleanPin);
      
      // STRICT ONE-TIME SIGNUP LIMIT CHECK
      if (existingIdx !== -1) {
        const existing = registrationsDatabase[existingIdx];
        if (existing.status === 'APPROVED') {
          return NextResponse.json({
            success: false,
            error: `Staff account (PIN #${cleanPin}) is ALREADY REGISTERED and approved. One-time signup limit reached. Please sign in directly.`,
            alreadyRegistered: true,
            status: 'APPROVED'
          }, { status: 400 });
        }
        if (existing.status === 'PENDING_APPROVAL') {
          return NextResponse.json({
            success: false,
            error: `Registration for PIN #${cleanPin} is ALREADY SUBMITTED and currently awaiting HR approval. Duplicate registration is not allowed.`,
            alreadyRegistered: true,
            status: 'PENDING_APPROVAL'
          }, { status: 400 });
        }
      }

      // Check unique phone number across staff
      const cleanPhoneDigits = (reg.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhoneDigits) {
        const phoneHolder = registrationsDatabase.find(r => {
          const digits = (r.phone || '').replace(/[^0-9]/g, '');
          return digits && digits.length >= 10 && digits.endsWith(cleanPhoneDigits.slice(-10)) && String(r.pin) !== cleanPin;
        });
        if (phoneHolder) {
          return NextResponse.json({
            success: false,
            error: `Mobile number ${reg.phone} is already linked to PIN #${phoneHolder.pin} (${phoneHolder.staffName}). Each staff member must register with their own phone number.`,
            alreadyRegistered: true
          }, { status: 400 });
        }
      }

      const newReg = {
        pin: cleanPin,
        phone: reg.phone,
        password: reg.password,
        staffName: reg.staffName,
        department_name: reg.department_name || 'General Operations',
        designation: reg.designation || 'Staff Member',
        photo_url: reg.photo_url || '',
        registeredAt: reg.registeredAt || new Date().toISOString(),
        status: cleanPin === '1' ? 'APPROVED' : 'PENDING_APPROVAL',
        approvedBy: cleanPin === '1' ? 'System SuperAdmin' : null,
        approvedAt: cleanPin === '1' ? new Date().toISOString() : null
      };

      if (existingIdx !== -1) {
        registrationsDatabase[existingIdx] = { ...registrationsDatabase[existingIdx], ...newReg };
      } else {
        registrationsDatabase.unshift(newReg);
      }

      // Update employee record with confirmed phone and photo
      const empIdx = staffDatabase.findIndex(e => String(e.biometric_pin) === cleanPin || e.id === cleanPin);
      if (empIdx !== -1) {
        staffDatabase[empIdx] = { 
          ...staffDatabase[empIdx], 
          ...(reg.phone ? { phone: reg.phone } : {}),
          ...(reg.photo_url ? { photo_url: reg.photo_url } : {})
        };
      }

      return NextResponse.json({
        success: true,
        message: cleanPin === '1' ? 'Admin account active' : 'Registration submitted for Admin approval',
        status: newReg.status,
        registration: newReg,
        registrations: registrationsDatabase,
        staff: staffDatabase
      });
    }

    // 2. Admin Approve Registration
    if (body.action === 'approve_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const regIdx = registrationsDatabase.findIndex(r => String(r.pin) === cleanPin);
      
      let staffName = '';
      let targetPhone = '';
      let approvedPhoto = '';

      if (regIdx !== -1) {
        registrationsDatabase[regIdx] = {
          ...registrationsDatabase[regIdx],
          status: 'APPROVED',
          approvedBy: body.approvedBy || 'HR Admin',
          approvedAt: new Date().toISOString()
        };
        staffName = registrationsDatabase[regIdx].staffName || '';
        targetPhone = registrationsDatabase[regIdx].phone || '';
        approvedPhoto = registrationsDatabase[regIdx].photo_url || '';
      }

      // Also ensure employee is active in staff list and update photo if uploaded
      const empIdx = staffDatabase.findIndex(e => String(e.biometric_pin) === cleanPin || e.id === cleanPin);
      if (empIdx !== -1) {
        staffDatabase[empIdx] = { 
          ...staffDatabase[empIdx], 
          status: 'active',
          ...(approvedPhoto ? { photo_url: approvedPhoto } : {})
        };
        if (!staffName) staffName = staffDatabase[empIdx].full_name;
        if (!targetPhone) targetPhone = staffDatabase[empIdx].phone;
      }

      // Send SMS Notification to staff member
      let smsResult: any = null;
      if (targetPhone) {
        try {
          const smsText = `Dear ${staffName || 'Staff'}, Your AP1 Staff Portal account (PIN #${cleanPin}) has been APPROVED and activated by HR. You can now log in at https://ap1hr.goinfi.biz/portal. - AP1 Television`;
          smsResult = await sendGoinfiSms(targetPhone, smsText, undefined, body.gatewayConfig);
        } catch (err: any) {
          console.warn('[Staff Approval SMS error]:', err?.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Staff PIN #${cleanPin} approved and activated successfully`,
        smsSent: smsResult?.success ?? false,
        smsChannel: smsResult?.channel,
        whatsappLink: smsResult?.whatsappLink,
        phone: targetPhone,
        registrations: registrationsDatabase,
        staff: staffDatabase
      });
    }

    // 3. Admin Reject Registration
    if (body.action === 'reject_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const regIdx = registrationsDatabase.findIndex(r => String(r.pin) === cleanPin);
      
      let staffName = '';
      let targetPhone = '';

      if (regIdx !== -1) {
        registrationsDatabase[regIdx] = {
          ...registrationsDatabase[regIdx],
          status: 'REJECTED',
          rejection_reason: body.reason || 'Registration rejected by administrator',
          rejectedAt: new Date().toISOString()
        };
        staffName = registrationsDatabase[regIdx].staffName || '';
        targetPhone = registrationsDatabase[regIdx].phone || '';
      }

      const empIdx = staffDatabase.findIndex(e => String(e.biometric_pin) === cleanPin || e.id === cleanPin);
      if (empIdx !== -1) {
        if (!staffName) staffName = staffDatabase[empIdx].full_name;
        if (!targetPhone) targetPhone = staffDatabase[empIdx].phone;
      }

      // Send SMS Notification to staff member
      let smsResult: any = null;
      if (targetPhone) {
        try {
          const smsText = `Dear ${staffName || 'Staff'}, Your AP1 Staff Portal registration request (PIN #${cleanPin}) was not approved by administration. Please contact the HR department for assistance. - AP1 Television`;
          smsResult = await sendGoinfiSms(targetPhone, smsText, undefined, body.gatewayConfig);
        } catch (err: any) {
          console.warn('[Staff Rejection SMS error]:', err?.message);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Staff PIN #${cleanPin} registration rejected`,
        smsSent: smsResult?.success ?? false,
        smsChannel: smsResult?.channel,
        whatsappLink: smsResult?.whatsappLink,
        phone: targetPhone,
        registrations: registrationsDatabase
      });
    }

    // 4. Check Registration Status for Login
    if (body.action === 'check_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const reg = registrationsDatabase.find(r => String(r.pin) === cleanPin);
      return NextResponse.json({
        success: true,
        isRegistered: !!reg,
        status: reg?.status || (cleanPin === '1' ? 'APPROVED' : 'NOT_REGISTERED'),
        registration: reg || null
      });
    }

    // 5. Direct full staff list update
    if (Array.isArray(body.staff)) {
      staffDatabase = body.staff;
      return NextResponse.json({
        success: true,
        message: 'Staff directory synchronized successfully',
        count: staffDatabase.length,
        staff: staffDatabase
      });
    }

    // 6. Single staff add or edit
    if (body.action === 'upsert' && body.employee) {
      const emp = body.employee;
      const idx = staffDatabase.findIndex(
        e => e.id === emp.id || (emp.biometric_pin && e.biometric_pin === emp.biometric_pin)
      );

      if (idx !== -1) {
        staffDatabase[idx] = { ...staffDatabase[idx], ...emp };
      } else {
        staffDatabase.unshift(emp);
      }

      return NextResponse.json({
        success: true,
        message: 'Staff member saved',
        staff: staffDatabase
      });
    }

    // 7. Delete staff
    if (body.action === 'delete' && body.id) {
      staffDatabase = staffDatabase.filter(e => e.id !== body.id && e.biometric_pin !== body.id);
      registrationsDatabase = registrationsDatabase.filter(r => r.pin !== body.id);
      return NextResponse.json({
        success: true,
        message: 'Staff member deleted',
        staff: staffDatabase
      });
    }

    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process staff operation', details: String(error) }, { status: 500 });
  }
}
