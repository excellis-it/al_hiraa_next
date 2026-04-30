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
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function cap(s?: string): string {
  if (!s || s === '—') return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateCandidateCV(data: CVData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const H = 297;

  // Palette
  const NAVY: RGB = [16, 50, 92];
  const NAVY2: RGB = [27, 66, 116];
  const NAVY3: RGB = [36, 78, 128];
  const GOLD: RGB = [207, 162, 62];
  const GOLD2: RGB = [228, 186, 89];
  const GOLD_PALE: RGB = [252, 245, 226];
  const WHITE: RGB = [255, 255, 255];
  const DARK: RGB = [28, 35, 50];
  const MID: RGB = [88, 100, 120];
  const PALE: RGB = [245, 247, 251];
  const CARD_BG: RGB = [250, 251, 253];
  const LINE: RGB = [212, 220, 230];
  const LIGHT_TEXT: RGB = [160, 176, 198];

  // Load logo
  const logoDataUrl = await loadImageAsDataUrl(`${window.location.origin}/logo.png`);

  function roundedBox(x: number, y: number, w: number, h: number, radius = 2.5, fill: RGB = WHITE, stroke?: RGB) {
    doc.setFillColor(...fill);
    if (stroke) doc.setDrawColor(...stroke);
    doc.roundedRect(x, y, w, h, radius, radius, 'F');
  }

  function secHead(title: string, x: number, y: number, w: number): number {
    doc.setFillColor(...NAVY);
    doc.roundedRect(x, y, w, 9.5, 2, 2, 'F');

    doc.setFillColor(...GOLD);
    doc.rect(x, y, 4, 9.5, 'F');

    doc.setFillColor(...GOLD2);
    doc.triangle(x + w - 10, y, x + w, y, x + w, y + 9.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...WHITE);
    doc.text(title, x + 8, y + 6.2);

    return y + 12;
  }

  function field(label: string, value: string, x: number, y: number, w: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...MID);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...DARK);

    const lines = doc.splitTextToSize(value || '—', w - 2);
    doc.text(lines, x, y + 4.3);

    return y + 5.5 + (lines.length - 1) * 4.5;
  }

  function hline(y: number, x1 = 14, x2 = W - 14) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(x1, y, x2, y);
  }

  function vline(x: number, y1: number, y2: number) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.line(x, y1, x, y2);
  }

  function drawLogo(x: number, y: number, size: number, boxW: number, boxH: number) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'F');
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'S');
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', x + 2, y + 2, size, size);
    }
  }

  // HEADER
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 46, 'F');

  doc.setFillColor(...NAVY2);
  doc.rect(0, 0, W, 2.2, 'F');

  doc.setFillColor(...GOLD);
  doc.rect(0, 43.5, W, 2.5, 'F');

  // logo block
  drawLogo(10, 6.5, 20, 28, 28);

  // header texts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(...WHITE);
  doc.text('AL-HIRAA MANPOWER', 42, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...GOLD2);
  doc.text('CONSULTANTS PVT. LTD.   •   KOLKATA, INDIA', 42, 23);

  doc.setFontSize(6.2);
  doc.setTextColor(181, 196, 219);
  doc.text('Govt. Recruitment Licence:  B-0519/KOL/PER/1000+/5/9427/2019', 42, 29);

  // Right badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(181, 196, 219);
  doc.text('CANDIDATE PROFILE', W - 14, 11, { align: 'right' });

  if (data.candidate_code) {
    doc.setFillColor(...GOLD);
    doc.roundedRect(W - 49, 14.5, 38, 13, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(data.candidate_code, W - 30, 22.8, { align: 'center' });
  } else {
    doc.setFillColor(44, 69, 106);
    doc.roundedRect(W - 38, 14.5, 26, 12, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.7);
    doc.setTextColor(183, 197, 217);
    doc.text('DRAFT', W - 25, 22.3, { align: 'center' });
  }

  // NAME BAND
  doc.setFillColor(240, 243, 248);
  doc.rect(0, 46, W, 28, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 46, 5, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(data.full_name || '—', 14, 60.5);

  const positions = data.positions?.filter(Boolean) ?? [];
  let tagX = 14;
  const tagY = 65.5;
  positions.slice(0, 3).forEach((pos) => {
    const text = pos.toUpperCase();
    const tw = doc.getTextWidth(text) + 10;
    doc.setFillColor(...NAVY3);
    doc.roundedRect(tagX, tagY, tw, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...GOLD2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(text, tagX + 5, tagY + 5);
    tagX += tw + 4;
  });

  // BODY
  const C1X = 14;
  const C2X = 117.5;
  const C1W = 98;
  const C2W = 78.5;
  const DIVX = 114;
  const PAD = 2.5;

  let y = 80;

  // BLOCK 1
  const block1Start = y;
  let a = y;
  let b = y;

  a = secHead('PERSONAL INFORMATION', C1X, a, C1W);
  roundedBox(C1X, a - 1, C1W, 58, 2, CARD_BG, LINE);
  a += 2;
  a = field('Full Name', data.full_name || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('Date of Birth', fmtDate(data.dob), C1X + 4, a, C1W - 8) + PAD;
  a = field('Gender', cap(data.gender), C1X + 4, a, C1W - 8) + PAD;
  a = field('Religion', data.religion || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('Passport No.', data.passport_no || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('ECR Type', data.ecr_type?.toUpperCase() || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('Education', data.education || '—', C1X + 4, a, C1W - 8) + PAD;

  b = secHead('CONTACT', C2X, b, C2W);
  roundedBox(C2X, b - 1, C2W, 34, 2, CARD_BG, LINE);
  b += 2;
  b = field('WhatsApp / Phone', data.whatsapp_no || '—', C2X + 4, b, C2W - 8) + PAD;
  b = field('Alternate Contact', data.alternate_contact || '—', C2X + 4, b, C2W - 8) + PAD;
  b = field('Email', data.email || '—', C2X + 4, b, C2W - 8) + PAD;

  b += 4;
  b = secHead('LOCATION', C2X, b, C2W);
  roundedBox(C2X, b - 1, C2W, 24, 2, CARD_BG, LINE);
  b += 2;
  b = field('State', data.state || '—', C2X + 4, b, C2W - 8) + PAD;
  b = field('City', data.city || '—', C2X + 4, b, C2W - 8) + PAD;

  y = Math.max(a, b) + 6;
  vline(DIVX, block1Start + 12, y - 4);
  hline(y - 3);

  // BLOCK 2
  const block2Start = y;
  a = y;
  b = y;

  a = secHead('EXPERIENCE & SKILLS', C1X, a, C1W);
  roundedBox(C1X, a - 1, C1W, 36, 2, CARD_BG, LINE);
  a += 2;
  a = field('Indian Work Experience', data.indian_experience || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('Abroad Work Experience', data.abroad_experience || '—', C1X + 4, a, C1W - 8) + PAD;
  a = field('English Speaking', cap(data.english_speaking), C1X + 4, a, C1W - 8) + PAD;
  a = field('Arabic Speaking', cap(data.arabic_speaking), C1X + 4, a, C1W - 8) + PAD;

  b = secHead('GULF PROFILE', C2X, b, C2W);
  roundedBox(C2X, b - 1, C2W, 34, 2, CARD_BG, LINE);
  b += 2;
  b = field(
    'Gulf Return',
    data.gulf_return ? 'Yes — Previously Deployed' : 'No',
    C2X + 4,
    b,
    C2W - 8
  ) + PAD;

  if (data.gulf_return_details) {
    b = field('Gulf Details', data.gulf_return_details, C2X + 4, b, C2W - 8) + PAD;
  }

  b = field('Indian Driving Licence', cap(data.indian_driving_license), C2X + 4, b, C2W - 8) + PAD;
  b = field('Gulf Driving Licence', cap(data.gulf_driving_license), C2X + 4, b, C2W - 8) + PAD;

  y = Math.max(a, b) + 6;
  vline(DIVX, block2Start + 12, y - 4);
  hline(y - 3);

  // REGISTRATION INFORMATION
  doc.setFillColor(...GOLD_PALE);
  doc.rect(0, y - 3, W, 1.1, 'F');

  y = secHead('REGISTRATION INFORMATION', C1X, y, W - 28);

  roundedBox(C1X, y - 1, W - 28, 20, 2, CARD_BG, LINE);

  const regCols: [string, string][] = [
    ['Registration Mode', cap(data.registration_mode)],
    ['Source / Channel', data.source || '—'],
    ['Registered On', fmtDate(data.registered_date)],
  ];
  if (data.referrer_name || data.referred_by) {
    regCols.push(['Referred By', data.referrer_name || data.referred_by || '—']);
  }
  if (data.associate_name) {
    regCols.push(['Associate / Sub-Agent', data.associate_name]);
  }

  const cw = (W - 28) / 3;
  let col = 0;
  let regY = y + 4;

  regCols.forEach(([lbl, val]) => {
    const rx = C1X + col * cw;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MID);
    doc.text(lbl.toUpperCase(), rx, regY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.7);
    doc.setTextColor(...DARK);
    doc.text(val || '—', rx, regY + 5);

    col++;
    if (col === 3) {
      col = 0;
      regY += 11;
    }
  });

  y = regY + 13;

  // REMARKS
  if (data.remarks) {
    hline(y - 1);
    y += 4;

    roundedBox(C1X, y - 1, W - 28, 16, 2, CARD_BG, LINE);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...MID);
    doc.text('REMARKS', C1X + 4, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...DARK);
    const rl = doc.splitTextToSize(data.remarks, W - 36);
    doc.text(rl.slice(0, 3), C1X + 4, y + 8);

    y += 19;
  }

  // FOOTER
  doc.setFillColor(...GOLD);
  doc.rect(0, H - 22, W, 2.3, 'F');

  doc.setFillColor(...NAVY);
  doc.rect(0, H - 19.7, W, 19.7, 'F');

  drawLogo(10, H - 17.6, 11, 18, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...WHITE);
  doc.text('AL-HIRAA MANPOWER CONSULTANTS PVT. LTD.', 31, H - 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GOLD2);
  doc.text('Confidential  •  For Internal Use Only', 31, H - 5.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(181, 196, 219);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${today}`, W - 12, H - 6.5, { align: 'right' });

  const filename = `${data.candidate_code || 'candidate'}-${(data.full_name || 'profile').replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}