import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PayrollRecord } from '../types';

export function generatePayslipPdf(payroll: PayrollRecord, companyName = 'AP1 Television') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthStr = monthNames[payroll.month - 1] || `Month ${payroll.month}`;

  // Company Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(companyName.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Kathmandu, Nepal | Phone: +977-1-4498765 | info@ap1.tv | ap1.tv', 14, 23);

  // Payslip Title Badge
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`CONFIDENTIAL SALARY PAYSLIP - ${monthStr.toUpperCase()} ${payroll.year}`, 14, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`, 140, 42);

  const targetHours = payroll.target_monthly_hours || (payroll.working_days * 8);
  const actualHours = payroll.actual_worked_hours ?? (targetHours - (payroll.shortfall_hours || 0));
  const shortfallHours = payroll.shortfall_hours ?? Math.max(0, targetHours - actualHours);

  // Employee Information Box
  autoTable(doc, {
    startY: 48,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      1: { textColor: [15, 23, 42], cellWidth: 62 },
      2: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 38 },
      3: { textColor: [15, 23, 42], cellWidth: 62 }
    },
    body: [
      ['Employee Name:', payroll.employee_name || 'N/A', 'PAN Number:', payroll.pan_number || 'PAN60129381'],
      ['Designation:', payroll.employee_designation || 'N/A', 'Bank Name:', payroll.bank_name || 'NIC Asia Bank'],
      ['Department:', payroll.department_name || 'Broadcasting', 'Account Number:', payroll.bank_account_number || '10928374829101'],
      ['Working Days / Target:', `${payroll.working_days} Days / ${targetHours.toFixed(1)} Hrs`, 'Payment Method:', payroll.payment_method || 'Bank Transfer'],
      ['Actual Hours Logged:', `${actualHours.toFixed(1)} Hrs`, 'Late / Shortfall Hours:', shortfallHours > 0 ? `${shortfallHours.toFixed(1)} Hrs Shortfall` : 'None (Full Hours)'],
    ]
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const earningsStartY = lastTable ? lastTable.finalY + 6 : 85;

  // Earnings & Deductions Tables
  const earningsData = [
    ['Basic Monthly Salary', `NPR ${payroll.base_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Allowances & Perks', `NPR ${payroll.allowances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    [`Overtime Pay (${payroll.overtime_hours} hrs)`, `NPR ${payroll.overtime_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  const deductionsData = [
    [shortfallHours > 0 ? `Late Arrival / Shortfall (${shortfallHours.toFixed(1)} hrs)` : 'Late Arrival Penalties', `NPR ${payroll.late_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Absence Deductions', `NPR ${payroll.absent_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Unpaid Leave (LWP)', `NPR ${payroll.unpaid_leave_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Advance Salary Repayment', `NPR ${payroll.advance_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
    ['Tax Deduction (TDS/SST)', `NPR ${payroll.tax_deduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
  ];

  const grossEarnings = payroll.base_salary + payroll.allowances + payroll.overtime_pay;
  const totalDeductions = payroll.late_deduction + payroll.absent_deduction + payroll.unpaid_leave_deduction + payroll.advance_deduction + payroll.tax_deduction;

  // Render Earnings Table
  autoTable(doc, {
    startY: earningsStartY,
    margin: { left: 14, right: 110 },
    theme: 'striped',
    head: [['EARNINGS', 'AMOUNT (NPR)']],
    headStyles: { fillColor: [15, 23, 42], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    body: [
      ...earningsData,
      ['Total Gross Earnings', `NPR ${grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
    ]
  });

  // Render Deductions Table side by side
  autoTable(doc, {
    startY: earningsStartY,
    margin: { left: 110, right: 14 },
    theme: 'striped',
    head: [['DEDUCTIONS', 'AMOUNT (NPR)']],
    headStyles: { fillColor: [185, 28, 28], fontSize: 8.5 }, // red-700
    styles: { fontSize: 8, cellPadding: 2.5 },
    body: [
      ...deductionsData,
      ['Total Deductions', `NPR ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
    ]
  });

  const nextY = Math.max(
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 160,
    earningsStartY + 55
  );

  // Net Pay Highlight Box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, nextY + 6, 182, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, nextY + 6, 182, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text('NET SALARY PAYABLE:', 22, nextY + 19);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`NPR ${payroll.net_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 85, nextY + 20);

  // Status badge
  doc.setFillColor(220, 252, 231); // green-100
  doc.roundedRect(160, nextY + 12, 28, 10, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(payroll.status.toUpperCase(), 168, nextY + 18.5);

  // Signatures & Disclaimers
  const footerY = nextY + 45;
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(18, footerY, 70, footerY);
  doc.line(140, footerY, 192, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Employee Signature', 26, footerY + 5);
  doc.text('Authorized HR / Director Signature', 140, footerY + 5);

  doc.setFontSize(7);
  doc.text('This is a computer-generated salary payslip from Goinfi-HR and does not require a physical seal if authorized digitally.', 14, 285);

  return doc;
}
