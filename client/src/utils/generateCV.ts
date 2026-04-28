import jsPDF from 'jspdf';

export interface CVData {
  candidate_code?: string;
  full_name: string;
  dob?: string;
  gender?: string;
  religion?: string;
  passport_no?: string;
  ecr_type?: string;
  education?: string;
  whatsapp_no?: string;
  alternate_contact?: string;
  email?: string;
  state?: string;
  city?: string;
  positions?: string[];
  indian_experience?: string;
  abroad_experience?: string;
  english_speaking?: string;
  arabic_speaking?: string;
  gulf_return?: boolean;
  gulf_return_details?: string;
  indian_driving_license?: string;
  gulf_driving_license?: string;
  registration_mode?: string;
  source?: string;
  registered_date?: string;
  referred_by?: string;
  associate_name?: string;
  referrer_name?: string;
  remarks?: string;
}

type RGB = [number, number, number];

function fmtDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function cap(s?: string): string {
  if (!s || s === '—') return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateCandidateCV(data: CVData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const BLUE: RGB    = [37, 99, 235];
  const BLUE50: RGB  = [239, 246, 255];
  const BLUE200: RGB = [191, 219, 254];
  const BLUE400: RGB = [96, 165, 250];
  const GRAY: RGB    = [107, 114, 128];
  const DARK: RGB    = [17, 24, 39];
  const SLATE: RGB   = [248, 250, 252];
  const LINE: RGB    = [229, 231, 235];

  // ── HEADER ────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AL-HIRAA MANPOWER', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BLUE200);
  doc.text('Manpower Consultants Pvt. Ltd.  •  Kolkata, India', 14, 22);

  // Right side — label + code
  doc.setTextColor(...BLUE200);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CANDIDATE PROFILE', W - 14, 13, { align: 'right' });

  if (data.candidate_code) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - 46, 17, 32, 11, 2, 2, 'F');
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(data.candidate_code, W - 30, 24, { align: 'center' });
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('DRAFT', W - 14, 25, { align: 'right' });
  }

  // ── NAME + POSITIONS ─────────────────────────────────────────
  doc.setFillColor(...SLATE);
  doc.rect(0, 40, W, 26, 'F');

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(data.full_name || '—', 14, 53);

  // Position tags
  const positions = data.positions?.filter(Boolean) ?? [];
  let tagX = 14;
  positions.forEach((pos) => {
    const tw = doc.getTextWidth(pos) + 8;
    doc.setFillColor(...BLUE50);
    doc.setDrawColor(...BLUE400);
    doc.roundedRect(tagX, 58, tw, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(pos, tagX + 4, 62.3);
    tagX += tw + 3;
  });

  // ── HELPERS ───────────────────────────────────────────────────
  function secHead(title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...BLUE);
    doc.rect(x, y, w, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title, x + 3, y + 4.5);
    return y + 9;
  }

  function row(label: string, value: string, x: number, y: number, w: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(value || '—', w);
    doc.text(lines, x, y + 4.5);
    return y + 5 + lines.length * 4.5;
  }

  function hline(y: number) {
    doc.setDrawColor(...LINE);
    doc.line(14, y, W - 14, y);
  }

  const C1X = 14, C2X = 114;
  const C1W = 92, C2W = 82;

  let y = 72;
  let a = y, b = y;

  // ── ROW 1 : PERSONAL  |  CONTACT + LOCATION ──────────────────
  a = secHead('PERSONAL INFORMATION', C1X, a, C1W);
  a = row('Full Name',     data.full_name,           C1X, a, C1W) + 1.5;
  a = row('Date of Birth', fmtDate(data.dob),         C1X, a, C1W) + 1.5;
  a = row('Gender',        cap(data.gender),           C1X, a, C1W) + 1.5;
  a = row('Religion',      data.religion || '—',       C1X, a, C1W) + 1.5;
  a = row('Passport No.',  data.passport_no || '—',    C1X, a, C1W) + 1.5;
  a = row('ECR Type',      data.ecr_type?.toUpperCase() || '—', C1X, a, C1W) + 1.5;
  a = row('Education',     data.education || '—',      C1X, a, C1W) + 1.5;

  b = secHead('CONTACT', C2X, b, C2W);
  b = row('WhatsApp / Phone',  data.whatsapp_no || '—',      C2X, b, C2W) + 1.5;
  b = row('Alternate Contact', data.alternate_contact || '—', C2X, b, C2W) + 1.5;
  b = row('Email',             data.email || '—',             C2X, b, C2W) + 1.5;

  b += 3;
  b = secHead('LOCATION', C2X, b, C2W);
  b = row('State', data.state || '—', C2X, b, C2W) + 1.5;
  b = row('City',  data.city  || '—', C2X, b, C2W) + 1.5;

  y = Math.max(a, b) + 5;
  hline(y - 2);

  // ── ROW 2 : EXPERIENCE  |  GULF PROFILE ──────────────────────
  a = y; b = y;

  a = secHead('EXPERIENCE & SKILLS', C1X, a, C1W);
  a = row('Indian Work Experience', data.indian_experience || '—', C1X, a, C1W) + 1.5;
  a = row('Abroad Work Experience', data.abroad_experience || '—', C1X, a, C1W) + 1.5;
  a = row('English Speaking',       cap(data.english_speaking),     C1X, a, C1W) + 1.5;
  a = row('Arabic Speaking',        cap(data.arabic_speaking),      C1X, a, C1W) + 1.5;

  b = secHead('GULF PROFILE', C2X, b, C2W);
  b = row('Gulf Return',           data.gulf_return ? 'Yes — Prev. Deployed' : 'No', C2X, b, C2W) + 1.5;
  if (data.gulf_return_details) {
    b = row('Gulf Details', data.gulf_return_details, C2X, b, C2W) + 1.5;
  }
  b = row('Indian Driving License', cap(data.indian_driving_license), C2X, b, C2W) + 1.5;
  b = row('Gulf Driving License',   cap(data.gulf_driving_license),   C2X, b, C2W) + 1.5;

  y = Math.max(a, b) + 5;
  hline(y - 2);

  // ── REGISTRATION ─────────────────────────────────────────────
  y = secHead('REGISTRATION INFO', C1X, y, W - 28);

  const regCols: [string, string][] = [
    ['Mode',          cap(data.registration_mode)],
    ['Source',        data.source || '—'],
    ['Registered On', data.registered_date ? fmtDate(data.registered_date) : '—'],
  ];
  if (data.referrer_name || data.referred_by)
    regCols.push(['Referred By', data.referrer_name || data.referred_by || '—']);
  if (data.associate_name)
    regCols.push(['Associate / Sub-Agent', data.associate_name]);

  const cw = (W - 28) / 3;
  let col = 0;
  let regY = y;
  regCols.forEach(([lbl, val]) => {
    const rx = C1X + col * cw;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(lbl.toUpperCase(), rx, regY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(val, rx, regY + 5);
    col++;
    if (col === 3) { col = 0; regY += 12; }
  });
  y = regY + 12;

  if (data.remarks) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text('REMARKS', C1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const rl = doc.splitTextToSize(data.remarks, W - 28);
    doc.text(rl.slice(0, 3), C1X, y + 5);
    y += 5 + Math.min(rl.length, 3) * 4.5;
  }

  // ── FOOTER ────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 280, W, 17, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AL-HIRAA MANPOWER CONSULTANTS PVT. LTD.', 14, 289);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BLUE200);
  doc.text('Generated by Al-Hiraa ATMS  •  Confidential  •  For Internal Use Only', 14, 294);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated: ${today}`, W - 14, 294, { align: 'right' });

  const filename = `${data.candidate_code || 'candidate'}-${(data.full_name || 'profile').replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}
