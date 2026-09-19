import { NextRequest, NextResponse } from 'next/server';

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
    designation: "Station Manager / Operations",
    phone: "9705355569",
    email: "gift@ap1tv.com",
    role: "admin",
    status: "active",
    join_date: "2024-01-01",
    base_salary: 85000,
    monthly_salary: 85000,
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: staffDatabase.length,
    staff: staffDatabase
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Direct full list update
    if (Array.isArray(body.staff)) {
      staffDatabase = body.staff;
      return NextResponse.json({
        success: true,
        message: 'Staff directory synchronized successfully',
        count: staffDatabase.length,
        staff: staffDatabase
      });
    }

    // Single staff add or edit
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

    // Delete staff
    if (body.action === 'delete' && body.id) {
      staffDatabase = staffDatabase.filter(e => e.id !== body.id && e.biometric_pin !== body.id);
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
