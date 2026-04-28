/**
 * Al-Hiraa Job Posting PDF Flyer — One-page Recruitment Flyer
 *
 * Structure:
 * - Logo + Al-Hiraa address/contact block with recruitment license highlighted
 * - Optional headline banner (per-job override, else auto from country)
 * - Vacancies + trade positions table
 * - Interview schedule with venue + Google Maps link
 * - Contact person / coordinator
 * - Al-Hiraa footer
 */

import { Download, X } from 'lucide-react';

const COUNTRY_LABELS: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia',
  uae: 'United Arab Emirates',
  qatar: 'Qatar',
  kuwait: 'Kuwait',
  bahrain: 'Bahrain',
  oman: 'Oman',
};

const CURRENCY_MAP: Record<string, string> = {
  saudi_arabia: 'SAR',
  uae: 'AED',
  qatar: 'QAR',
  kuwait: 'KWD',
  bahrain: 'BHD',
  oman: 'OMR',
};

function ordinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtInterviewDate(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '';
  const s = new Date(start);
  const day = ordinal(s.getDate());
  const month = s.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const year = s.getFullYear();
  if (end && end !== start) {
    const e = new Date(end);
    return `${day} & ${ordinal(e.getDate())} ${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

interface Position {
  id?: number;
  trade?: { id: number; name: string };
  quantity: number;
  salary?: number;
  accommodation?: boolean;
  transportation?: boolean;
  contract_period?: string;
  age?: string;
}

interface Job {
  id: number;
  title: string;
  positions_required: number;
  salary_min?: number;
  salary_max?: number;
  service_fee?: number;
  interview_date_start?: string;
  interview_date_end?: string;
  country?: string;
  notes?: string;
  description?: string;
  flyer_headline?: string;
  company?: { name: string };
  trade?: { name: string };
  positions?: Position[];
}

interface Venue {
  name?: string;
  address?: string;
  google_maps_url?: string;
  phone?: string;
}

interface JobPostingPrintProps {
  jobs: Job[];
  venue?: Venue;
  contactPerson?: string;
  contactPhone?: string;
  onClose: () => void;
}

export default function JobPostingPrint({
  jobs,
  venue,
  contactPerson,
  contactPhone,
  onClose,
}: JobPostingPrintProps) {
  if (jobs.length === 0) return null;

  const firstJob = jobs[0];
  const country = firstJob.country || 'saudi_arabia';
  const currency = CURRENCY_MAP[country] || 'SAR';
  const countryLabel = COUNTRY_LABELS[country] || country;
  const interviewDateStr = fmtInterviewDate(firstJob.interview_date_start, firstJob.interview_date_end);

  const headline =
    firstJob.flyer_headline?.trim() ||
    `URGENT REQUIREMENT FOR A LEADING COMPANY IN ${countryLabel.toUpperCase()}`;

  // Collect all positions
  const rows: { name: string; qty: number; salary: string; fee: string; accom: string; transport: string; contract: string; age: string }[] = [];
  for (const job of jobs) {
    if (job.positions && job.positions.length > 0) {
      for (const pos of job.positions) {
        rows.push({
          name: pos.trade?.name?.toUpperCase() || job.title.toUpperCase(),
          qty: pos.quantity,
          salary: pos.salary ? `${Number(pos.salary).toLocaleString()} ${currency}` : 'As Per Company Norms',
          fee: job.service_fee ? `₹${Number(job.service_fee).toLocaleString('en-IN')}` : 'NIL',
          accom: pos.accommodation ? 'PROVIDED' : 'NOT PROVIDED',
          transport: pos.transportation ? 'PROVIDED' : 'NOT PROVIDED',
          contract: pos.contract_period ? `${pos.contract_period} YEAR${+pos.contract_period > 1 ? 'S' : ''}` : '—',
          age: pos.age || '21 - 40 YEARS',
        });
      }
    } else {
      rows.push({
        name: job.title.toUpperCase(),
        qty: job.positions_required,
        salary: job.salary_min ? `${job.salary_min}–${job.salary_max || job.salary_min} ${currency}` : 'As Per Company Norms',
        fee: job.service_fee ? `₹${Number(job.service_fee).toLocaleString('en-IN')}` : 'NIL',
        accom: '—',
        transport: '—',
        contract: '—',
        age: '21 - 40 YEARS',
      });
    }
  }

  const totalVacancies = rows.reduce((s, r) => s + r.qty, 0);
  const serviceFeeText = rows[0]?.fee && rows[0].fee !== 'NIL' ? rows[0].fee : '';

  const notesList = (firstJob.notes || '').split('\n').map(l => l.trim()).filter(Boolean);
  const defaultNotes = [
    'Accommodation & transportation as listed in the table.',
    'Working hours: 9 hours per day (1 hour break), 6 days a week.',
    'Both ECR / ECNR candidates eligible.',
    'Other benefits as per labour law of the country of employment.',
    'Food / medical as per company policy.',
    'Candidates must carry all original documents on the day of interview.',
  ];
  const displayNotes = notesList.length > 0 ? notesList : defaultNotes;

  const venueName = venue?.name || '';
  const venueAddress = venue?.address || '';
  const mapsUrl = venue?.google_maps_url || '';
  const venueLine =
    venueName && venueAddress ? `${venueName}, ${venueAddress}` : venueName || venueAddress || '';

  // Density: if many trade rows, tighten the table styles
  const dense = rows.length > 6;
  const rowPad = dense ? '4px 5px' : '6px 6px';
  const rowFont = dense ? '9.5px' : '10.5px';

  const printStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    @page { size: A4; margin: 10mm; }
    .page { width: 794px; padding: 20px 30px; position: relative; }
    @media print {
      body { margin: 0; }
      .page { width: 100%; padding: 6mm 8mm; page-break-inside: avoid; page-break-after: avoid; }
      .no-print { display: none !important; }
    }

    /* ── Header ── */
    .header { display: flex; align-items: stretch; border: 2px solid #1a3a6b; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
    .header-logo { background: #1a3a6b; padding: 10px 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 140px; }
    .header-logo .brand { color: #fff; font-size: 20px; font-weight: 900; letter-spacing: 2px; line-height: 1; }
    .header-logo .tagline { color: #a8c4e8; font-size: 8px; font-weight: 600; letter-spacing: 0.4px; margin-top: 3px; text-align: center; }
    .header-info { flex: 1; padding: 8px 12px; border-left: 2px solid #1a3a6b; }
    .header-info .company-title { font-size: 10px; font-weight: 700; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .header-info p { font-size: 8.5px; color: #444; line-height: 1.5; }
    .header-info .highlight { color: #c00; font-weight: 700; }
    .header-right { padding: 8px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 130px; border-left: 2px solid #1a3a6b; background: #fdf6d8; }
    .header-right .lic { font-size: 8px; color: #555; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .header-right .lic-num { font-size: 10px; color: #1a3a6b; font-weight: 900; margin-top: 2px; text-align: center; }

    /* ── Headline banner ── */
    .headline { background: #1a3a6b; color: #fff; text-align: center; padding: 8px 14px; margin: 8px 0; font-size: 12px; font-weight: 900; letter-spacing: 1.2px; border-radius: 3px; }

    /* ── Vacancies pill ── */
    .vac-strip { display: flex; align-items: center; justify-content: space-between; border: 1.5px dashed #1a3a6b; border-radius: 4px; padding: 5px 12px; margin-bottom: 8px; }
    .vac-strip .label { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
    .vac-strip .count { font-size: 13px; font-weight: 900; color: #c00; }

    /* ── Interview schedule ── */
    .sched { background: #fffde6; border: 1.5px solid #f9a825; padding: 6px 12px; margin-bottom: 8px; text-align: center; border-radius: 3px; }
    .sched .head { font-size: 10px; font-weight: 900; color: #333; text-transform: uppercase; letter-spacing: 0.4px; }
    .sched .date-line { font-size: 13px; font-weight: 900; color: #b71c1c; letter-spacing: 1px; margin-top: 2px; }
    .sched .venue { font-size: 9.5px; color: #444; margin-top: 2px; font-weight: 600; }
    .sched .venue a { color: #1a73e8; text-decoration: underline; font-weight: 700; }

    /* ── Contact strip ── */
    .contact { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 5px 10px; margin-bottom: 8px; background: #eef4ff; border-radius: 3px; }
    .contact .label { font-size: 9px; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .contact .value { font-size: 11px; color: #1a3a6b; font-weight: 800; }

    /* ── Table ── */
    .tbl-wrap { margin-bottom: 8px; }
    .tbl-title { background: #1a3a6b; color: #fff; font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; padding: 5px 10px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #ddeeff; }
    thead th { font-size: 9.5px; font-weight: 700; padding: 5px; border: 1px solid #9ab; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; color: #1a3a6b; }
    tbody td { font-size: ${rowFont}; padding: ${rowPad}; border: 1px solid #bcc; text-align: center; vertical-align: middle; }
    tbody td.trade { text-align: left; font-weight: 700; padding-left: 8px; color: #111; }
    tbody tr:nth-child(even) { background: #f5f9ff; }
    .total-row td { background: #1a3a6b; color: #fff; font-weight: 700; font-size: 10.5px; }

    .fee-note { font-size: 9.5px; font-weight: 700; color: #c00; margin-bottom: 6px; }

    /* ── Notes ── */
    .notes-box { border: 1px solid #ccc; border-radius: 3px; margin-bottom: 8px; overflow: hidden; }
    .notes-head { background: #f0f0f0; padding: 4px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #333; border-bottom: 1px solid #ccc; }
    .notes-list { padding: 4px 18px; }
    .notes-list li { font-size: 9px; line-height: 1.5; color: #333; }

    /* ── Footer ── */
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; padding-top: 8px; border-top: 2px double #1a3a6b; }
    .footer-left .regards { font-size: 9.5px; color: #444; }
    .footer-left .name { font-size: 12px; font-weight: 900; color: #1a3a6b; margin-top: 2px; }
    .footer-left .title { font-size: 9px; color: #555; font-weight: 600; }
    .stamp { border: 2px solid #1a3a6b; border-radius: 50%; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; text-align: center; color: #1a3a6b; font-weight: 900; font-size: 7.5px; padding: 4px; line-height: 1.3; }
  `;

  const htmlContent = `<!DOCTYPE html>
<html><head>
  <title>Al-Hiraa — Recruitment Flyer</title>
  <meta charset="UTF-8">
  <style>${printStyles}</style>
</head><body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      <div class="brand">AL-HIRAA</div>
      <div class="tagline">MANPOWER CONSULTANT PVT. LTD.</div>
    </div>
    <div class="header-info">
      <div class="company-title">Overseas Manpower Services</div>
      <p>Head Office: P.S. Corporate Park, Office No. 1201-B1, 12th Floor, Salt Lake, Sector-V, Kolkata — 700 091</p>
      <p>Branch: 85 Elliot Road, 3rd Floor, Kolkata 700016 &nbsp;|&nbsp; 25 Ripon Street, Ground Floor, Kolkata 700016</p>
      <p><span class="highlight">Tel: 033-40067970</span> &nbsp;|&nbsp; Email: alhiraa@gmail.com &nbsp;|&nbsp; Web: www.alhiraa.in</p>
    </div>
    <div class="header-right">
      <div class="lic">Govt. of India<br>Recruitment Licence</div>
      <div class="lic-num">B-0519/KOL/PER<br>/1000+/5/9427/2019</div>
    </div>
  </div>

  <div class="headline">${headline}</div>

  <div class="vac-strip">
    <span class="label">Total Vacancies</span>
    <span class="count">${totalVacancies} POSTS</span>
  </div>

  ${
    interviewDateStr
      ? `<div class="sched">
          <div class="head">Face to Face Client Interview Schedule</div>
          <div class="date-line">📅 ${interviewDateStr}</div>
          ${
            venueLine
              ? `<div class="venue">📍 ${venueLine}${mapsUrl ? ` · <a href="${mapsUrl}" target="_blank">View on Google Maps</a>` : ''}</div>`
              : ''
          }
        </div>`
      : ''
  }

  ${
    contactPerson
      ? `<div class="contact">
          <span class="label">Contact Person</span>
          <span class="value">${contactPerson}${contactPhone ? ` · ${contactPhone}` : ''}</span>
        </div>`
      : ''
  }

  <div class="tbl-wrap">
    <div class="tbl-title">Job Details &amp; Requirements</div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">S.No</th>
          <th style="text-align:left; padding-left:10px">Trade / Position</th>
          <th style="width:50px">Posts</th>
          <th style="width:125px">Basic Salary (${currency})</th>
          <th style="width:70px">Accomm.</th>
          <th style="width:70px">Transport</th>
          <th style="width:60px">Contract</th>
          <th style="width:70px">Age Limit</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="trade">${row.name}</td>
          <td style="font-weight:700; color:#1a3a6b">${row.qty}</td>
          <td style="font-weight:600">${row.salary}</td>
          <td style="color:${row.accom === 'PROVIDED' ? '#2e7d32' : '#666'}">${row.accom}</td>
          <td style="color:${row.transport === 'PROVIDED' ? '#2e7d32' : '#666'}">${row.transport}</td>
          <td>${row.contract}</td>
          <td>${row.age}</td>
        </tr>`,
          )
          .join('')}
        <tr class="total-row">
          <td colspan="2" style="text-align:right; padding-right:10px">TOTAL VACANCIES</td>
          <td>${totalVacancies}</td>
          <td colspan="5"></td>
        </tr>
      </tbody>
    </table>
  </div>

  ${serviceFeeText ? `<p class="fee-note">★ Agency Service Fee: ${serviceFeeText} per selected candidate (payable after visa stamping)</p>` : ''}

  <div class="notes-box">
    <div class="notes-head">Terms &amp; Conditions / Important Notes</div>
    <ol class="notes-list">
      ${displayNotes.map((n) => `<li>${n.replace(/^\d+\.\s*/, '')}</li>`).join('')}
    </ol>
  </div>

  <div class="footer">
    <div class="footer-left">
      <div class="regards">With Best Regards,</div>
      <div class="name">SEEMAB AHMED</div>
      <div class="title">Managing Director — Al-Hiraa Manpower Consultant Pvt. Ltd.</div>
    </div>
    <div class="stamp">AL-HIRAA<br>MANPOWER<br>CONSULTANT<br>Pvt. Ltd.<br>KOLKATA</div>
  </div>
</div>
</body></html>`;

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=860,height=1160');
    if (!w) return;
    w.document.write(htmlContent);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="font-semibold text-gray-800">Interview Flyer Preview</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalVacancies} vacancies · {interviewDateStr || 'Date TBD'}
              {venueName ? ` · ${venueName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-primary text-sm flex items-center gap-2">
              <Download size={14} /> Print / Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <iframe
            title="flyer-preview"
            className="bg-white shadow-xl rounded-lg mx-auto block"
            style={{ width: 794, height: 1123, border: 'none' }}
            srcDoc={htmlContent}
          />
        </div>
      </div>
    </div>
  );
}
