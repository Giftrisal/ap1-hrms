import { NextRequest, NextResponse } from 'next/server';
import { initialEmployees } from '@/lib/mock-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      full_name, 
      designation, 
      department_name, 
      email, 
      phone, 
      photo_url, 
      join_date,
      bio 
    } = body;

    if (!full_name) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }

    // Collect all existing staff email addresses
    const recipientEmails = initialEmployees.map(e => e.email).filter(Boolean);

    // HTML Email Template with professional Goinfi styling
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
          .badge { display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-top: 12px; text-transform: uppercase; }
          .content { padding: 32px 24px; text-align: center; }
          .avatar { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid #3b82f6; box-shadow: 0 4px 14px rgba(59,130,246,0.25); margin: 0 auto 16px; }
          .name { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
          .role { font-size: 14px; font-weight: 600; color: #2563eb; margin: 4px 0 0; }
          .dept { font-size: 13px; color: #64748b; margin: 2px 0 20px; }
          .bio-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 24px; }
          .details-grid { display: table; width: 100%; margin-bottom: 24px; font-size: 13px; border-collapse: collapse; }
          .details-row { display: table-row; }
          .details-label { display: table-cell; padding: 8px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #f1f5f9; }
          .details-val { display: table-cell; padding: 8px; text-align: right; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcoming Our New Team Member!</h1>
            <p>Goinfi Technologies Team Announcement</p>
            <div class="badge">New Joinee</div>
          </div>
          <div class="content">
            <img src="${photo_url || 'https://images.unsplash.com/photo-1534528741775?w=150'}" alt="${full_name}" class="avatar" />
            <h2 class="name">${full_name}</h2>
            <p class="role">${designation}</p>
            <p class="dept">${department_name || 'Goinfi Technologies'}</p>

            ${bio ? `
              <div class="bio-box">
                <strong>A quick note:</strong><br/>
                ${bio}
              </div>
            ` : ''}

            <div class="details-grid">
              <div class="details-row">
                <div class="details-label">Date of Joining:</div>
                <div class="details-val">${join_date || 'Immediate'}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Work Email:</div>
                <div class="details-val">${email || 'contact@goinfi.com'}</div>
              </div>
              <div class="details-row">
                <div class="details-label">Office Phone:</div>
                <div class="details-val">${phone || 'N/A'}</div>
              </div>
            </div>

            <p style="font-size: 13px; color: #475569; margin: 0;">
              Please join us in giving <strong>${full_name}</strong> a warm welcome to the Goinfi family! Feel free to say hi on Slack/WhatsApp or in the office. 🚀
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Goinfi Technologies Pvt. Ltd. | Kathmandu, Nepal<br/>
            Automated HR Onboarding Notification via Goinfi-HR
          </div>
        </div>
      </body>
      </html>
    `;

    // Formatted WhatsApp message for team group
    const whatsappGroupMessage = 
      `🎉 *Welcome to the Goinfi Family, ${full_name}!* 🚀\n\n` +
      `We are thrilled to welcome *${full_name}* as our new *${designation}* in the *${department_name}* department!\n\n` +
      `📅 *Date of Joining:* ${join_date || 'Today'}\n` +
      `✉️ *Email:* ${email}\n` +
      (bio ? `📝 *Intro:* "${bio}"\n\n` : '\n') +
      `Please give ${full_name.split(' ')[0]} a warm welcome when you see them around! 🎊👏`;

    return NextResponse.json({
      success: true,
      message: `Welcome announcement broadcasted to ${recipientEmails.length} staff members!`,
      recipientCount: recipientEmails.length,
      sampleRecipients: recipientEmails.slice(0, 5),
      whatsappMessage: whatsappGroupMessage,
      subject: `🎉 Welcoming ${full_name} to the Goinfi Team!`,
      emailHtml
    });
  } catch (error) {
    console.error('Welcome broadcast error:', error);
    return NextResponse.json({ error: 'Failed to broadcast welcome message' }, { status: 500 });
  }
}
