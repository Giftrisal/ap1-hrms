import { NextRequest, NextResponse } from 'next/server';
import { sendGoinfiSms } from '@/lib/sms';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ignoatjmfuhdxrmjycpp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SUPABASE_STAFF_CONFIG_ID = 'goinfi-system-ap1-staff-list';

function getTmpCachePath(): string {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }
    return path.join(dataDir, 'ap1_staff_cache_v3.json');
  } catch {}
  const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
  return path.join(tmpDir, 'ap1_staff_cache_v3.json');
}

// In-memory cache for ultra-fast response
let memoryStaffCache: { staff: any[]; registrations: any[]; lastFetched: number } | null = null;

async function loadStaffDirectory(forceRefresh = false): Promise<{ staff: any[]; registrations: any[] }> {
  const now = Date.now();
  if (!forceRefresh && memoryStaffCache && now - memoryStaffCache.lastFetched < 1500) {
    return { staff: memoryStaffCache.staff, registrations: memoryStaffCache.registrations };
  }

  // 1. Primary: Load from persistent local file cache
  try {
    const p = getTmpCachePath();
    const fallbackP = '/tmp/ap1_staff_cache_v3.json';
    const filePath = fs.existsSync(p) ? p : (fs.existsSync(fallbackP) ? fallbackP : null);
    if (filePath) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content && Array.isArray(content.staff)) {
        memoryStaffCache = { staff: content.staff, registrations: content.registrations || [], lastFetched: now };
        return { staff: content.staff, registrations: content.registrations || [] };
      }
    }
  } catch {}

  // 2. Fetch from Supabase Master Cloud Database
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', SUPABASE_STAFF_CONFIG_ID)
      .maybeSingle();

    if (!error && data?.content?.[0]) {
      const payload = data.content[0];
      const staff = Array.isArray(payload.staff) ? payload.staff : [];
      const registrations = Array.isArray(payload.registrations) ? payload.registrations : [];
      
      memoryStaffCache = { staff, registrations, lastFetched: now };

      // Update local cache
      try {
        fs.writeFileSync(getTmpCachePath(), JSON.stringify({ staff, registrations }, null, 2), 'utf-8');
      } catch {}

      return { staff, registrations };
    }
  } catch (err) {
    console.warn('[Staff API] Supabase read note:', err);
  }

  // 3. Fallback
  try {
    const p = getTmpCachePath();
    if (fs.existsSync(p)) {
      const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (content && Array.isArray(content.staff)) {
        memoryStaffCache = { staff: content.staff, registrations: content.registrations || [], lastFetched: now };
        return { staff: content.staff, registrations: content.registrations || [] };
      }
    }
  } catch {}

  return { staff: [], registrations: [] };
}

async function saveStaffDirectory(staff: any[], registrations: any[]): Promise<void> {
  memoryStaffCache = { staff, registrations, lastFetched: Date.now() };

  // 1. Save to persistent local file
  try {
    const raw = JSON.stringify({ staff, registrations }, null, 2);
    fs.writeFileSync(getTmpCachePath(), raw, 'utf-8');
    try {
      fs.writeFileSync('/tmp/ap1_staff_cache_v3.json', raw, 'utf-8');
    } catch {}
  } catch (err) {
    console.error('[Staff API] Local save error:', err);
  }

  // 2. Save to Supabase Cloud Database (Instant synchronization across all computers)
  try {
    await supabase.from('articles').upsert({
      id: SUPABASE_STAFF_CONFIG_ID,
      slug: 'goinfi-staff-ap1',
      title: 'AP1 Enterprise HRMS Staff Directory',
      category: 'system_config',
      content: [{ staff, registrations, updatedAt: new Date().toISOString() }]
    });
  } catch (err) {
    console.error('[Staff API] Supabase save error:', err);
  }
}

export async function GET() {
  const { staff, registrations } = await loadStaffDirectory();
  const pendingCount = registrations.filter(r => r.status === 'PENDING_APPROVAL').length;

  // Build high-priority map of photos uploaded by staff from mobile app registrations
  const regPhotoMap = new Map<string, string>();
  registrations.forEach((r: any) => {
    if (r.pin && r.photo_url) {
      const p = String(r.pin).trim();
      regPhotoMap.set(p, r.photo_url);
      if (p === '1' || p === '100') {
        regPhotoMap.set('1', r.photo_url);
        regPhotoMap.set('100', r.photo_url);
      }
    }
  });

  // SECURITY FIX: Never leak staff passwords or credentials in public GET response!
  const sanitizedRegistrations = registrations.map((r: any) => {
    const { password, ...safe } = r;
    return safe;
  });

  let hasMergedNewPhotos = false;
  const sanitizedStaff = staff.map((s: any) => {
    const pin = String(s.biometric_pin || s.id || '').replace('emp-', '').trim();
    const photoFromReg = regPhotoMap.get(pin);
    const effectivePhoto = s.photo_url || photoFromReg || '';

    if (!s.photo_url && effectivePhoto) {
      s.photo_url = effectivePhoto;
      hasMergedNewPhotos = true;
    }

    const { password, ...safe } = s;
    return {
      ...safe,
      photo_url: effectivePhoto
    };
  });

  // If missing photos were merged into the staff array, update cache so it remains permanently synced
  if (hasMergedNewPhotos) {
    saveStaffDirectory(staff, registrations).catch(() => {});
  }

  return NextResponse.json(
    {
      success: true,
      count: sanitizedStaff.length,
      staff: sanitizedStaff,
      registrations: sanitizedRegistrations,
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
    const isCriticalAction = ['submit_registration', 'approve_registration', 'reject_registration', 'check_registration', 'update_profile_photo'].includes(body.action);
    let { staff, registrations } = await loadStaffDirectory(isCriticalAction);

    // 1. Submit Registration from Staff Portal (Awaiting Admin Approval)
    if (body.action === 'submit_registration' && body.registration) {
      const reg = body.registration;
      const cleanPin = String(reg.pin).trim();
      
      const existingIdx = registrations.findIndex(r => String(r.pin) === cleanPin);
      
      // STRICT ONE-TIME SIGNUP LIMIT CHECK
      if (existingIdx !== -1) {
        const existing = registrations[existingIdx];
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
        const phoneHolder = registrations.find(r => {
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
        registrations[existingIdx] = { ...registrations[existingIdx], ...newReg };
      } else {
        registrations.unshift(newReg);
      }

      // Update employee record with confirmed phone and photo
      const empIdx = staff.findIndex(e => String(e.biometric_pin) === cleanPin || String(e.id) === cleanPin || e.id === `emp-${cleanPin}`);
      if (empIdx !== -1) {
        staff[empIdx] = { 
          ...staff[empIdx], 
          ...(reg.phone ? { phone: reg.phone } : {}),
          ...(reg.photo_url ? { photo_url: reg.photo_url } : {})
        };
      }

      await saveStaffDirectory(staff, registrations);

      return NextResponse.json({
        success: true,
        message: cleanPin === '1' ? 'Admin account active' : 'Registration submitted for Admin approval',
        status: newReg.status,
        registration: newReg,
        registrations,
        staff
      });
    }

    // 2. Admin Approve Registration
    if (body.action === 'approve_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const regIdx = registrations.findIndex(r => String(r.pin) === cleanPin);
      
      let staffName = '';
      let targetPhone = '';
      let approvedPhoto = '';

      if (regIdx !== -1) {
        registrations[regIdx] = {
          ...registrations[regIdx],
          status: 'APPROVED',
          approvedBy: body.approvedBy || 'HR Admin',
          approvedAt: new Date().toISOString()
        };
        staffName = registrations[regIdx].staffName || '';
        targetPhone = registrations[regIdx].phone || '';
        approvedPhoto = registrations[regIdx].photo_url || '';
      }

      // Also ensure employee is active in staff list and update photo if uploaded
      const empIdx = staff.findIndex(e => String(e.biometric_pin) === cleanPin || String(e.id) === cleanPin || e.id === `emp-${cleanPin}`);
      if (empIdx !== -1) {
        staff[empIdx] = { 
          ...staff[empIdx], 
          status: 'active',
          ...(approvedPhoto ? { photo_url: approvedPhoto } : {})
        };
        if (!staffName) staffName = staff[empIdx].full_name;
        if (!targetPhone) targetPhone = staff[empIdx].phone;
      }

      await saveStaffDirectory(staff, registrations);

      // Send SMS Notification to staff member
      let smsResult: any = null;
      if (targetPhone) {
        try {
          const smsText = `Dear ${staffName || 'Staff'}, Your AP1 Staff Portal account (PIN #${cleanPin}) has been APPROVED and activated by HR. You can now log in at https://hr.ap1hdtv.com/portal. - AP1 Television`;
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
        registrations,
        staff
      });
    }

    // 3. Admin Reject Registration
    if (body.action === 'reject_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const regIdx = registrations.findIndex(r => String(r.pin) === cleanPin);
      
      let staffName = '';
      let targetPhone = '';

      if (regIdx !== -1) {
        registrations[regIdx] = {
          ...registrations[regIdx],
          status: 'REJECTED',
          rejection_reason: body.reason || 'Registration rejected by administrator',
          rejectedAt: new Date().toISOString()
        };
        staffName = registrations[regIdx].staffName || '';
        targetPhone = registrations[regIdx].phone || '';
      }

      const empIdx = staff.findIndex(e => String(e.biometric_pin) === cleanPin || e.id === cleanPin);
      if (empIdx !== -1) {
        if (!staffName) staffName = staff[empIdx].full_name;
        if (!targetPhone) targetPhone = staff[empIdx].phone;
      }

      await saveStaffDirectory(staff, registrations);

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
        registrations
      });
    }

    // 4. Check Registration Status for Login
    if (body.action === 'check_registration' && body.pin) {
      const cleanPin = String(body.pin).trim();
      const reg = registrations.find(r => String(r.pin) === cleanPin);
      return NextResponse.json({
        success: true,
        isRegistered: !!reg,
        status: reg?.status || (cleanPin === '1' ? 'APPROVED' : 'NOT_REGISTERED'),
        registration: reg || null
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
      });
    }

    // 5. Update Profile Photo directly from Staff Portal
    if (body.action === 'update_profile_photo' && body.pin && body.photo_url) {
      const cleanPin = String(body.pin).trim();
      const photoUrl = String(body.photo_url);

      let updated = false;

      // Update in staff directory with flexible PIN and ID matching
      const empIdx = staff.findIndex(e => {
        const sPin = String(e.biometric_pin || '').trim();
        const sId = String(e.id || '').replace('emp-', '').trim();
        return sPin === cleanPin || sId === cleanPin || e.id === `emp-${cleanPin}` ||
          (cleanPin === '1' && (sPin === '100' || e.full_name?.toLowerCase().includes('gift'))) ||
          (cleanPin === '100' && (sPin === '1' || e.full_name?.toLowerCase().includes('gift')));
      });

      if (empIdx !== -1) {
        staff[empIdx] = {
          ...staff[empIdx],
          photo_url: photoUrl
        };
        updated = true;
      }

      // Update in registrations
      const regIdx = registrations.findIndex(r => {
        const rPin = String(r.pin).trim();
        return rPin === cleanPin ||
          (cleanPin === '1' && rPin === '100') ||
          (cleanPin === '100' && rPin === '1');
      });

      if (regIdx !== -1) {
        registrations[regIdx] = {
          ...registrations[regIdx],
          photo_url: photoUrl
        };
        updated = true;
      }

      if (updated) {
        await saveStaffDirectory(staff, registrations);
      }

      return NextResponse.json({
        success: true,
        message: 'Profile photo synchronized successfully across HRMS',
        photo_url: photoUrl,
        staff
      });
    }

    // 6. Direct full staff list update (Preserve existing mobile-uploaded photos)
    if (Array.isArray(body.staff)) {
      // Build a map of existing photos from current staff and registrations
      const existingPhotos = new Map<string, string>();
      staff.forEach(s => {
        if (s.biometric_pin && s.photo_url) existingPhotos.set(String(s.biometric_pin).trim(), s.photo_url);
      });
      registrations.forEach(r => {
        if (r.pin && r.photo_url) existingPhotos.set(String(r.pin).trim(), r.photo_url);
      });

      // Merge: if incoming staff has empty photo_url but existing has a photo, preserve it!
      staff = body.staff.map((newS: any) => {
        const pin = String(newS.biometric_pin || '').trim();
        const photo = newS.photo_url || existingPhotos.get(pin) || (pin === '100' ? existingPhotos.get('1') : (pin === '1' ? existingPhotos.get('100') : undefined)) || '';
        return {
          ...newS,
          photo_url: photo
        };
      });

      await saveStaffDirectory(staff, registrations);
      return NextResponse.json({
        success: true,
        message: 'Staff directory synchronized successfully to cloud database',
        count: staff.length,
        staff
      });
    }

    // 7. Assign PIN to employee
    if (body.action === 'assign_pin' && (body.staffId || body.employee_id || body.id) && body.pin) {
      const targetId = String(body.staffId || body.employee_id || body.id).trim();
      const cleanPin = String(body.pin).trim();

      // Find staff by ID
      let idx = staff.findIndex(e => String(e.id).trim() === targetId);
      if (idx === -1) {
        idx = staff.findIndex(
          e => String(e.biometric_pin || '').trim() === cleanPin ||
               (body.employee?.full_name && e.full_name === body.employee.full_name)
        );
      }

      if (idx !== -1) {
        // Clear this PIN from any other staff member to avoid collisions
        staff = staff.map((s, sIdx) => {
          if (sIdx !== idx && String(s.biometric_pin || '').trim() === cleanPin) {
            return { ...s, biometric_pin: '' };
          }
          return s;
        });

        staff[idx] = {
          ...staff[idx],
          ...(body.employee || {}),
          biometric_pin: cleanPin
        };

        // Also update matching registration if exists
        const regIdx = registrations.findIndex(r => String(r.pin).trim() === cleanPin);
        if (regIdx !== -1) {
          registrations[regIdx] = {
            ...registrations[regIdx],
            staffName: staff[idx].full_name,
            department_name: staff[idx].department_name || registrations[regIdx].department_name,
            designation: staff[idx].designation || registrations[regIdx].designation
          };
        }

        await saveStaffDirectory(staff, registrations);

        return NextResponse.json({
          success: true,
          message: `PIN #${cleanPin} successfully assigned to ${staff[idx].full_name}`,
          staff,
          assignedStaff: staff[idx]
        });
      } else if (body.employee) {
        const newEmp = { ...body.employee, biometric_pin: cleanPin };
        staff.unshift(newEmp);
        await saveStaffDirectory(staff, registrations);
        return NextResponse.json({
          success: true,
          message: `PIN #${cleanPin} successfully assigned to new staff member`,
          staff,
          assignedStaff: newEmp
        });
      }
    }

    // 8. Single staff add or edit (upsert)
    if (body.action === 'upsert' && body.employee) {
      const emp = body.employee;
      const targetPin = emp.biometric_pin ? String(emp.biometric_pin).trim() : '';

      // Match by ID first
      let idx = staff.findIndex(e => String(e.id).trim() === String(emp.id).trim());
      if (idx === -1 && targetPin) {
        idx = staff.findIndex(e => String(e.biometric_pin || '').trim() === targetPin);
      }

      if (idx !== -1) {
        if (targetPin) {
          // Clear duplicate PIN from others
          staff = staff.map((s, sIdx) => {
            if (sIdx !== idx && String(s.biometric_pin || '').trim() === targetPin) {
              return { ...s, biometric_pin: '' };
            }
            return s;
          });
        }
        staff[idx] = { ...staff[idx], ...emp, ...(targetPin ? { biometric_pin: targetPin } : {}) };
      } else {
        staff.unshift(emp);
      }

      await saveStaffDirectory(staff, registrations);

      return NextResponse.json({
        success: true,
        message: 'Staff member saved to cloud database',
        staff
      });
    }

    // 9. Delete staff
    if (body.action === 'delete' && body.id) {
      staff = staff.filter(e => e.id !== body.id && e.biometric_pin !== body.id);
      registrations = registrations.filter(r => r.pin !== body.id);
      await saveStaffDirectory(staff, registrations);

      return NextResponse.json({
        success: true,
        message: 'Staff member deleted from cloud database',
        staff
      });
    }

    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process staff operation', details: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    let { staff, registrations } = await loadStaffDirectory();

    const emp = body.employee || (body.id ? body : null);
    const targetPin = body.pin || (emp ? emp.biometric_pin : null);
    const targetId = body.staffId || body.employee_id || (emp ? emp.id : null);

    if (targetId) {
      const cleanId = String(targetId).trim();
      const cleanPin = targetPin ? String(targetPin).trim() : null;

      let idx = staff.findIndex(e => String(e.id).trim() === cleanId);
      if (idx !== -1) {
        if (cleanPin) {
          staff = staff.map((s, sIdx) => {
            if (sIdx !== idx && String(s.biometric_pin || '').trim() === cleanPin) {
              return { ...s, biometric_pin: '' };
            }
            return s;
          });
          staff[idx] = {
            ...staff[idx],
            ...(emp || {}),
            biometric_pin: cleanPin
          };
        } else if (emp) {
          staff[idx] = { ...staff[idx], ...emp };
        }

        await saveStaffDirectory(staff, registrations);

        return NextResponse.json({
          success: true,
          message: 'Staff updated successfully',
          staff,
          employee: staff[idx]
        });
      }
    }

    if (emp && emp.id) {
      staff.unshift(emp);
      await saveStaffDirectory(staff, registrations);
      return NextResponse.json({
        success: true,
        message: 'Staff created successfully',
        staff,
        employee: emp
      });
    }

    return NextResponse.json({ error: 'Staff member not found or invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('PUT /api/staff error:', error);
    return NextResponse.json({ error: 'Failed to update staff', details: String(error) }, { status: 500 });
  }
}
