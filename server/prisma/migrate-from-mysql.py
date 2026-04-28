#!/usr/bin/env python3
"""
Migrate data from MySQL SQL dump (excelv4f_alhiraa) to PostgreSQL (alhiradb).

Connects directly to PostgreSQL via psycopg2. Configure via DATABASE_URL env var,
defaults to local postgres on 127.0.0.1:5433.

Requires: pip3 install --user psycopg2-binary

Phases:
   1. Read SQL dump
   2. Parse all source tables
   3. Dedupe trades from candidate_positions
   4. Wipe destination DB (FK-safe order)
   5. Create 5 system users (admin/recruiter/manager/process_manager/data_entry)
   6. Import master data (trades, states, cities, sources)
   7. Import companies (no test-data filter)
   8. Import candidates (152 INSERT statements -> ~20k rows)
   9. Import candidate_licences -> update candidates' driving license arrays
  10. Import jobs
  11. Import candidate_jobs -> CandidateJob + ProcessDetails + Payments
  12. Import candidate_activities -> CallLog
  13. Print summary
"""

import re
import os
import sys
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values

SQL_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'excelv4f_alhiraa (2).sql')
DB_URL = os.environ.get('DATABASE_URL', 'postgresql://excellis:1234@127.0.0.1:5433/alhiradb')

# Single shared system user for all old-DB user references
DEFAULT_USER_ID = 'admin-001'

# ============================================================
# SQL dump parser
# ============================================================

def parse_inserts(content, table_name):
    """Parse INSERT INTO statements for a table, returning list of dicts."""
    rows = []
    pattern = rf"INSERT INTO `{table_name}` \(([^)]+)\) VALUES\s*"

    for match in re.finditer(pattern, content):
        cols_str = match.group(1)
        cols = [c.strip().strip('`') for c in cols_str.split(',')]

        # Walk forward to find the closing semicolon at depth 0.
        # Must be quote-aware: parens inside string literals must not affect depth.
        start = match.end()
        depth = 0
        in_quote = False
        escaped = False
        values_str = None
        i = start
        while i < len(content):
            ch = content[i]
            if escaped:
                escaped = False
                i += 1
                continue
            if ch == '\\':
                escaped = True
                i += 1
                continue
            if ch == "'":
                in_quote = not in_quote
                i += 1
                continue
            if in_quote:
                i += 1
                continue
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    j = i + 1
                    while j < len(content) and content[j] in ' \n\r\t':
                        j += 1
                    if j < len(content) and content[j] == ';':
                        values_str = content[start:i + 1]
                        break
            i += 1
        if values_str is None:
            continue

        values_str = values_str.strip()
        if values_str.startswith('('):
            values_str = values_str[1:]
        if values_str.endswith(')'):
            values_str = values_str[:-1]

        raw_rows = re.split(r'\),?\s*\n\(', values_str)

        for raw_row in raw_rows:
            raw_row = raw_row.strip()
            if not raw_row:
                continue

            vals = []
            current = ''
            in_quote = False
            quote_char = None
            escaped = False

            for ch in raw_row:
                if escaped:
                    current += ch
                    escaped = False
                    continue
                if ch == '\\':
                    escaped = True
                    current += ch
                    continue
                if ch == "'" and not in_quote:
                    in_quote = True
                    quote_char = ch
                    current += ch
                elif ch == quote_char and in_quote:
                    current += ch
                    in_quote = False
                elif ch == ',' and not in_quote:
                    vals.append(current.strip())
                    current = ''
                else:
                    current += ch
            if current.strip():
                vals.append(current.strip())

            row = {}
            for idx, col in enumerate(cols):
                if idx < len(vals):
                    v = vals[idx]
                    if v == 'NULL':
                        row[col] = None
                    elif v.startswith("'") and v.endswith("'"):
                        row[col] = v[1:-1].replace("\\'", "'").replace("\\\\", "\\")
                    else:
                        try:
                            row[col] = int(v)
                        except ValueError:
                            try:
                                row[col] = float(v)
                            except ValueError:
                                row[col] = v
                else:
                    row[col] = None
            rows.append(row)

    return rows


# ============================================================
# Value mappers
# ============================================================

def parse_date(val):
    """Parse date from DD-MM-YYYY or YYYY-MM-DD, return YYYY-MM-DD string or None."""
    if not val:
        return None
    s = str(val).strip()
    if not s:
        return None
    # Truncate timestamp portion if present
    s = s.split(' ')[0]
    for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def parse_decimal(val):
    """Parse decimal-ish input. Handles '1000+200' (sums), commas, and rejects garbage."""
    if val is None or val == '':
        return None
    try:
        s = str(val).replace(',', '').strip()
        if not s:
            return None
        if '+' in s:
            return sum(float(x) for x in s.split('+') if x.strip())
        return float(s)
    except (ValueError, TypeError):
        return None


def map_registration_mode(val):
    if not val:
        return None
    return {
        'CALLING': 'phone', 'TELECALLING': 'phone',
        'WALK-IN': 'walk_in', 'WALK IN': 'walk_in',
        'ONLINE': 'online',
        'REFERENCE': 'referral', 'REFERRAL': 'referral',
        'ASSOCIATE': 'associate',
        'CAMP': 'camp',
        'APP': 'online',
    }.get(str(val).upper().strip(), 'phone')


def map_english(val):
    if not val:
        return None
    return {
        'NONE': 'none', 'NO': 'none',
        'BASIC': 'basic',
        'GOOD': 'conversational', 'CONVERSATIONAL': 'conversational',
        'FLUENT': 'fluent',
        'YES': 'basic',
    }.get(str(val).upper().strip())


def map_gender(val):
    if not val:
        return None
    return {'MALE': 'male', 'FEMALE': 'female', 'OTHER': 'other', 'M': 'male', 'F': 'female'}.get(
        str(val).upper().strip()
    )


def map_ecr(val):
    if not val:
        return None
    return {'ECR': 'ecr', 'ECNR': 'ecnr'}.get(str(val).upper().strip())


def map_country(text):
    if not text:
        return None
    s = str(text).upper()
    if 'SAUDI' in s:
        return 'saudi_arabia'
    if 'UAE' in s or 'DUBAI' in s or 'ABU DHABI' in s:
        return 'uae'
    if 'QATAR' in s:
        return 'qatar'
    if 'KUWAIT' in s:
        return 'kuwait'
    if 'BAHRAIN' in s:
        return 'bahrain'
    if 'OMAN' in s:
        return 'oman'
    return None


def map_industry(val):
    if not val:
        return None
    return {
        'RESTAURANT': 'hospitality', 'HOSPITALITY': 'hospitality', 'QSR': 'hospitality',
        'COFFEE SHOP': 'hospitality', 'CATERING': 'hospitality', 'FOOD DELIVERY': 'hospitality',
        'FACTORY': 'manufacturing',
        'CONSTRUCTION': 'construction', 'MEP': 'construction',
        'OIL': 'oil_and_gas', 'OIL & GAS': 'oil_and_gas',
        'RETAIL': 'hospitality', 'RETAILS': 'hospitality',
        'IT': 'other', 'IT RETAIL': 'other', 'LOGISTIC': 'other',
        'HOUSEKEEPING': 'facilities',
        'MARKETING': 'other', 'MARKETIN': 'other',
    }.get(str(val).upper().strip(), 'other')


def map_interest_status(val):
    """Old job_interview_status -> InterestStatus enum."""
    if not val:
        return 'not_contacted'
    return {
        'INTERESTED': 'contacted_interested',
        'NOT-INTERESTED': 'contacted_not_interested',
        'NOT INTERESTED': 'contacted_not_interested',
        'SELECTED': 'interview_selected',
        'NOT-APPEARED': 'contacted_not_reachable',
        'NOT APPEARED': 'contacted_not_reachable',
        'APPEARED': 'lined_up',
    }.get(str(val).upper().strip(), 'not_contacted')


def map_call_outcome(val):
    """Old call_status -> CallOutcome enum."""
    if not val:
        return 'reached'
    s = str(val).upper().strip()
    return {
        'INTERESTED': 'interested',
        'NOT INTERESTED': 'not_interested',
        'NOT-INTERESTED': 'not_interested',
        'CALL BACK': 'call_back',
        'CALLBACK': 'call_back',
        'NOT REACHABLE': 'not_reachable',
        'NOT-REACHABLE': 'not_reachable',
        'WRONG NUMBER': 'wrong_number',
        'WRONG-NUMBER': 'wrong_number',
        'REACHED': 'reached',
        'VOICEMAIL': 'voicemail',
        'LINE BUSY': 'line_busy',
        'SWITCHED OFF': 'switched_off',
    }.get(s, 'reached')


# ============================================================
# Main migration
# ============================================================

def main():
    print('=' * 60)
    print('Al-Hiraa MySQL -> PostgreSQL Migration')
    print('=' * 60)

    print(f'\nConnecting to: {DB_URL}')
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print('\n[1/13] Reading SQL file...')
    with open(SQL_FILE, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    print(f'  Read {len(content):,} bytes')

    print('\n[2/13] Parsing source tables...')
    src_positions = parse_inserts(content, 'candidate_positions')
    src_states = parse_inserts(content, 'states')
    src_cities = parse_inserts(content, 'cities')
    src_sources = parse_inserts(content, 'sources')
    src_companies = parse_inserts(content, 'companies')
    src_jobs = parse_inserts(content, 'jobs')
    src_candidates = parse_inserts(content, 'candidates')
    src_licences = parse_inserts(content, 'candidate_licences')
    src_candjobs = parse_inserts(content, 'candidate_jobs')
    src_activities = parse_inserts(content, 'candidate_activities')
    print(f'  positions={len(src_positions)}, states={len(src_states)}, cities={len(src_cities)}, sources={len(src_sources)}')
    print(f'  companies={len(src_companies)}, jobs={len(src_jobs)}, candidates={len(src_candidates)}')
    print(f'  licences={len(src_licences)}, candidate_jobs={len(src_candjobs)}, activities={len(src_activities)}')

    print('\n[3/13] Deduplicating trades from candidate_positions...')
    seen = set()
    unique_trades = []
    old_position_id_to_name = {}
    for p in src_positions:
        name = (p.get('name') or '').strip().upper()
        # Skip parser noise / overly long values; keep within VARCHAR(200) budget
        if not name or len(name) > 200 or '\n' in name:
            continue
        old_position_id_to_name[p.get('id')] = name
        if name not in seen:
            seen.add(name)
            unique_trades.append({'name': name, 'is_active': bool(p.get('is_active', 1))})
    print(f'  {len(src_positions)} positions -> {len(unique_trades)} unique trades')

    print('\n[4/13] Wiping destination DB...')
    cur.execute("""
    SET session_replication_role = 'replica';
    """)
    for tbl in [
        'associate_commissions', 'fee_change_requests', 'dropouts', 'deployments',
        'interview_checkins', 'interview_events', 'process_tracking', 'process_details',
        'payments', 'call_logs', 'candidate_jobs', 'candidates', 'jobs', 'companies',
        'referrers', 'associates', 'cities', 'states', 'trades', 'sources',
        'job_positions', 'job_interview_dates', 'notifications', 'activity_log',
        'message_templates', 'interview_venues', 'users',
    ]:
        cur.execute(f'DELETE FROM {tbl};')
    cur.execute("SET session_replication_role = 'origin';")
    conn.commit()
    print('  Done')

    print('\n[5/13] Creating 5 system users...')
    # Pre-hashed passwords matching the existing seed:
    # admin-001 / admin@alhiraa.com / Admin@123
    # others   / Password@123
    # Pre-hashed passwords (bcrypt cost 10):
    #   admin-001 -> Admin@123
    #   others    -> Password@123
    HASH_ADMIN = '$2b$10$fLtlHVxXTWELzKfPOU2yN.Ll/zsIHhcIWe4zMEUNqdocvLMmS6cHC'
    HASH_USER = '$2b$10$33KkK2cyYskjSV3E4n0cCuHAAGRyadCrGpBH88XqavoxOfgKk6l/2'
    users_data = [
        ('admin-001', 'System Admin', 'admin@alhiraa.com', '9999900001', HASH_ADMIN, 'admin'),
        ('dataentry-001', 'Data Entry User', 'dataentry@alhiraa.com', '9999900002', HASH_USER, 'data_entry'),
        ('recruiter-001', 'Recruiter User', 'recruiter@alhiraa.com', '9999900003', HASH_USER, 'recruiter'),
        ('manager-001', 'Manager User', 'manager@alhiraa.com', '9999900004', HASH_USER, 'manager'),
        ('procmgr-001', 'Process Manager', 'process@alhiraa.com', '9999900005', HASH_USER, 'process_manager'),
    ]
    execute_values(cur, """
        INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at)
        VALUES %s
    """, [(u[0], u[1], u[2], u[3], u[4], u[5], True, datetime.now(), datetime.now()) for u in users_data])
    conn.commit()
    print('  Created 5 system users (admin@alhiraa.com / Admin@123)')

    print('\n[6/13] Importing master data (trades, states, cities, sources)...')

    # Trades
    execute_values(cur, """
        INSERT INTO trades (name, is_active, created_at) VALUES %s
    """, [(t['name'], t['is_active'], datetime.now()) for t in unique_trades])
    conn.commit()

    cur.execute('SELECT id, name FROM trades;')
    trade_name_to_new_id = {row[1].upper(): row[0] for row in cur.fetchall()}
    old_position_id_to_new_trade_id = {
        old_id: trade_name_to_new_id[name]
        for old_id, name in old_position_id_to_name.items()
        if name in trade_name_to_new_id
    }
    print(f'  trades: {len(unique_trades)}')

    # States - keep original IDs
    execute_values(cur, """
        INSERT INTO states (id, name, created_at) VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, [(s['id'], s['name'], datetime.now()) for s in src_states])
    cur.execute("SELECT setval('states_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM states), 1));")
    conn.commit()
    print(f'  states: {len(src_states)}')

    # Cities - keep original IDs, FK to state must exist
    valid_state_ids = {s['id'] for s in src_states}
    cities_rows = [
        (c['id'], c['name'], c.get('state_id'), datetime.now())
        for c in src_cities
        if c.get('state_id') in valid_state_ids
    ]
    execute_values(cur, """
        INSERT INTO cities (id, name, state_id, created_at) VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, cities_rows, page_size=500)
    cur.execute("SELECT setval('cities_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM cities), 1));")
    conn.commit()
    print(f'  cities: {len(cities_rows)}')

    # Sources - keep original IDs
    execute_values(cur, """
        INSERT INTO sources (id, name, created_at) VALUES %s
        ON CONFLICT (id) DO NOTHING
    """, [(s['id'], s['name'], datetime.now()) for s in src_sources])
    cur.execute("SELECT setval('sources_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM sources), 1));")
    conn.commit()
    print(f'  sources: {len(src_sources)}')

    source_name_to_id = {(s.get('name') or '').upper().strip(): s['id'] for s in src_sources}

    print('\n[7/13] Importing companies (no test-data filter)...')
    # Insert with RETURNING and capture old_id -> new_id
    old_to_new_company = {}
    for c in src_companies:
        name = (c.get('company_name') or '').strip()
        if not name:
            continue
        country = map_country(c.get('company_address')) or 'saudi_arabia'  # default
        industry = map_industry(c.get('company_industry'))
        status = 'active' if c.get('status') == 1 else 'inactive'
        cur.execute("""
            INSERT INTO companies (name, country, industry, phone, email, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        """, (
            name, country, industry,
            c.get('company_phone'), c.get('company_email'), status,
            c.get('created_at') or datetime.now(),
            c.get('updated_at') or datetime.now(),
        ))
        new_id = cur.fetchone()[0]
        old_to_new_company[c.get('id')] = new_id
    conn.commit()
    print(f'  companies: {len(old_to_new_company)}')

    print('\n[8/13] Importing candidates...')
    candidate_rows = []
    skipped = 0
    seen_whatsapp = set()  # dedupe within source data
    seen_passport = set()
    for cand in src_candidates:
        full_name = (cand.get('full_name') or '').strip()
        whatsapp = (cand.get('whatapp_no') or cand.get('contact_no') or '').strip()
        if not full_name or not whatsapp:
            skipped += 1
            continue
        if whatsapp in seen_whatsapp:
            skipped += 1
            continue
        seen_whatsapp.add(whatsapp)

        passport = (cand.get('passport_number') or '').strip() or None
        if passport and passport in seen_passport:
            passport = None  # drop duplicate passport rather than skip the row
        if passport:
            seen_passport.add(passport)

        state_id = cand.get('state_id')
        if state_id is not None and state_id not in valid_state_ids:
            state_id = None

        # position_applied_for_N is stored as a quoted string in source ('5'), but our
        # lookup map keys are ints. Coerce to int (drop garbage values silently).
        def _pos(field):
            raw = cand.get(field)
            if raw in (None, ''):
                return None
            try:
                return old_position_id_to_new_trade_id.get(int(str(raw).strip()))
            except (TypeError, ValueError):
                return None
        pos1 = _pos('position_applied_for_1')
        pos2 = _pos('position_applied_for_2')
        pos3 = _pos('position_applied_for_3')

        source_id = source_name_to_id.get((cand.get('source') or '').upper().strip())

        candidate_rows.append((
            cand.get('id'),  # OLD id, captured here for tracking only (not inserted)
            full_name,
            whatsapp,
            map_gender(cand.get('gender')),
            parse_date(cand.get('date_of_birth')),
            passport,
            map_ecr(cand.get('ecr_type')),
            state_id,
            (cand.get('education') or '').strip() or None,
            (cand.get('other_education') or '').strip() or None,
            map_english(cand.get('english_speak')),
            str(cand.get('arabic_speak') or '').upper() in ('YES', 'TRUE', '1'),
            bool(cand.get('return')),
            (cand.get('indian_exp') or '').strip() or None,
            (cand.get('abroad_exp') or '').strip() or None,
            pos1, pos2, pos3,
            map_registration_mode(cand.get('mode_of_registration')),
            source_id,
            (cand.get('alternate_contact_no') or '').strip() or None,
            (cand.get('email') or '').strip() or None,
            (cand.get('religion') or '').strip() or None,
            DEFAULT_USER_ID,
            'complete',
            [], [],  # driving licenses populated in next phase
            cand.get('created_at') or datetime.now(),
            cand.get('updated_at') or datetime.now(),
        ))

    # Bulk insert (without old id)
    insert_rows = [r[1:] for r in candidate_rows]
    execute_values(cur, """
        INSERT INTO candidates (
            full_name, whatsapp_no, gender, dob, passport_no, ecr_type,
            state_id, education, education_other, english_speaking, arabic_speaking,
            gulf_return, indian_experience, abroad_experience,
            position_1_id, position_2_id, position_3_id,
            registration_mode, source_id, alternate_contact, email, religion,
            registered_by, completion_status, indian_driving_license, gulf_driving_license,
            created_at, updated_at
        ) VALUES %s
        ON CONFLICT (whatsapp_no) DO NOTHING
    """, insert_rows, page_size=500)
    conn.commit()

    # Build old_candidate_id -> new_candidate_id map by joining on whatsapp_no
    cur.execute('SELECT id, whatsapp_no FROM candidates;')
    whatsapp_to_new_id = {row[1]: row[0] for row in cur.fetchall()}
    old_to_new_candidate = {
        r[0]: whatsapp_to_new_id[r[2]]
        for r in candidate_rows
        if r[2] in whatsapp_to_new_id
    }
    print(f'  candidates: {len(old_to_new_candidate)} imported, {skipped} skipped')

    print('\n[9/13] Importing candidate_licences -> driving license arrays...')
    # Group by candidate -> {indian: [...], gulf: [...]}
    licences_by_candidate = {}
    for lic in src_licences:
        old_cand_id = lic.get('candidate_id')
        new_cand_id = old_to_new_candidate.get(old_cand_id)
        if not new_cand_id:
            continue
        ltype = (lic.get('licence_type') or '').lower().strip()
        lname = (lic.get('licence_name') or '').strip()
        if not lname:
            continue
        bucket = licences_by_candidate.setdefault(new_cand_id, {'indian': [], 'gulf': []})
        if ltype == 'gulf':
            bucket['gulf'].append(lname)
        else:
            bucket['indian'].append(lname)

    update_count = 0
    for new_cand_id, lics in licences_by_candidate.items():
        cur.execute("""
            UPDATE candidates SET indian_driving_license = %s, gulf_driving_license = %s
            WHERE id = %s
        """, (lics['indian'], lics['gulf'], new_cand_id))
        update_count += 1
    conn.commit()
    print(f'  licences: {len(src_licences)} source rows -> {update_count} candidates updated')

    print('\n[10/13] Importing jobs...')
    old_to_new_job = {}
    job_skip = 0
    for job in src_jobs:
        old_company = job.get('company_id')
        new_company = old_to_new_company.get(old_company)
        if not new_company:
            job_skip += 1
            continue

        old_pos = job.get('candidate_position_id')
        new_trade = old_position_id_to_new_trade_id.get(old_pos)
        if not new_trade:
            # fallback to first available trade
            new_trade = next(iter(trade_name_to_new_id.values()), None)
            if not new_trade:
                job_skip += 1
                continue

        title = (job.get('job_name') or '').strip() or old_position_id_to_name.get(old_pos, 'General').title()

        try:
            positions_req = max(1, int(job.get('quantity_of_people_required') or 1))
        except (TypeError, ValueError):
            positions_req = 1

        salary = parse_decimal(job.get('salary')) or 0
        service_fee = parse_decimal(job.get('service_charge')) or 0
        status = 'closed' if str(job.get('status') or '').lower() == 'closed' else 'open'
        country = map_country(job.get('address')) or 'saudi_arabia'

        cur.execute("""
            INSERT INTO jobs (
                company_id, trade_id, title, positions_required,
                salary_min, service_fee, status, country, created_by,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            new_company, new_trade, title, positions_req,
            salary, service_fee, status, country, DEFAULT_USER_ID,
            job.get('created_at') or datetime.now(),
            job.get('updated_at') or datetime.now(),
        ))
        new_job_id = cur.fetchone()[0]
        old_to_new_job[job.get('id')] = new_job_id
    conn.commit()
    print(f'  jobs: {len(old_to_new_job)} imported, {job_skip} skipped (no company/trade)')

    print('\n[11/13] Importing candidate_jobs -> CandidateJob + ProcessDetails + Payments...')
    cj_count = 0
    cj_skip = 0
    pd_count = 0
    pay_count = 0
    # Track first candidate_job per candidate for use by call log migration
    candidate_to_first_cj = {}

    for cj in src_candjobs:
        new_cand_id = old_to_new_candidate.get(cj.get('candidate_id'))
        new_job_id = old_to_new_job.get(cj.get('job_id'))
        if not new_cand_id or not new_job_id:
            cj_skip += 1
            continue

        # Look up trade_id from job
        cur.execute('SELECT trade_id FROM jobs WHERE id = %s;', (new_job_id,))
        row = cur.fetchone()
        trade_id = row[0] if row else None

        status = map_interest_status(cj.get('job_interview_status'))

        try:
            cur.execute("""
                INSERT INTO candidate_jobs (
                    candidate_id, job_id, trade_id, status, assigned_to,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (candidate_id, job_id) DO UPDATE SET status = EXCLUDED.status
                RETURNING id;
            """, (
                new_cand_id, new_job_id, trade_id, status, DEFAULT_USER_ID,
                cj.get('created_at') or datetime.now(),
                cj.get('updated_at') or datetime.now(),
            ))
            new_cj_id = cur.fetchone()[0]
        except psycopg2.Error as e:
            conn.rollback()
            cj_skip += 1
            continue
        cj_count += 1

        if new_cand_id not in candidate_to_first_cj:
            candidate_to_first_cj[new_cand_id] = new_cj_id

        # ProcessDetails
        pd_fields = {
            'mofa_number': (cj.get('mofa_no') or '').strip() or None,
            'mofa_date': parse_date(cj.get('mofa_date')),
            'mofa_received_date': parse_date(cj.get('mofa_received_date')),
            'vfs_applied_date': parse_date(cj.get('vfs_applied_date')),
            'vfs_received_date': parse_date(cj.get('vfs_received_date')),
            'medical_app_date': parse_date(cj.get('medical_application_date')),
            'medical_approval_date': parse_date(cj.get('medical_approval_date')),
            'medical_completion_date': parse_date(cj.get('medical_completion_date')),
            'medical_expiry_date': parse_date(cj.get('medical_expiry_date')),
            'medical_repeat_date': parse_date(cj.get('medical_repeat_date')),
            'medical_status': (cj.get('medical_status') or '').strip().lower() or None,
            'courier_sent_date': parse_date(cj.get('courrier_sent_date')),
            'courier_received_date': parse_date(cj.get('courrier_received_date')),
            'visa_receiving_date': parse_date(cj.get('visa_receiving_date')),
            'visa_issue_date': parse_date(cj.get('visa_issue_date')),
            'visa_expiry_date': parse_date(cj.get('visa_expiry_date')),
            'ticket_booking_date': parse_date(cj.get('ticket_booking_date')),
            'ticket_confirm_date': parse_date(cj.get('ticket_confirmation_date')),
            'onboarding_city': (cj.get('onboarding_flight_city') or '').strip() or None,
            'deployment_date': parse_date(cj.get('deployment_date')),
            'date_of_interview': parse_date(cj.get('date_of_interview')),
            'date_of_selection': parse_date(cj.get('date_of_selection')),
            'mode_of_selection': (cj.get('mode_of_selection') or '').strip() or None,
            'interview_location': (cj.get('interview_location') or '').strip() or None,
            'client_remark': (cj.get('client_remarks') or '').strip() or None,
            'sponsor': (cj.get('sponsor') or '').strip() or None,
            'vendor': (cj.get('vendor_id') or '').strip() if cj.get('vendor_id') else None,
            'vendor_service_charge': parse_decimal(cj.get('vendor_service_charge')),
            'family_contact_name': (cj.get('family_contact_name') or '').strip() or None,
            'family_contact_phone': (cj.get('family_contact_no') or '').strip() or None,
            'other_remarks': (cj.get('other_remarks') or '').strip() or None,
            'total_received_amount': parse_decimal(cj.get('total_amount')),
        }
        # Only insert if at least one field is non-null
        if any(v is not None for v in pd_fields.values()):
            cols = ['candidate_job_id'] + list(pd_fields.keys()) + ['created_at', 'updated_at']
            vals = [new_cj_id] + list(pd_fields.values()) + [datetime.now(), datetime.now()]
            placeholders = ', '.join(['%s'] * len(cols))
            cur.execute(
                f'INSERT INTO process_details ({", ".join(cols)}) VALUES ({placeholders}) '
                f'ON CONFLICT (candidate_job_id) DO NOTHING',
                vals
            )
            pd_count += 1

        # Payments - up to 4 installments
        total = parse_decimal(cj.get('total_amount')) or 0
        installments = [
            (1, parse_decimal(cj.get('fst_installment_amount')), parse_date(cj.get('fst_installment_date')),
             cj.get('fst_installment_remarks')),
            (2, parse_decimal(cj.get('secnd_installment_amount')), parse_date(cj.get('secnd_installment_date')),
             cj.get('secnd_installment_remarks')),
            (3, parse_decimal(cj.get('third_installment_amount')), parse_date(cj.get('third_installment_date')),
             cj.get('third_installment_remarks')),
            (4, parse_decimal(cj.get('fourth_installment_amount')), parse_date(cj.get('fourth_installment_date')),
             cj.get('fourth_installment_remarks')),
        ]
        any_installment = any(amt for _, amt, _, _ in installments)
        if any_installment:
            for inst_no, amt, date, remark in installments:
                if not amt:
                    continue
                cur.execute("""
                    INSERT INTO payments (
                        candidate_job_id, total_fee, installment_number, amount_due, amount_paid,
                        due_date, status, notes, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_cj_id, total or amt, inst_no, amt, amt, date or datetime.now().date(),
                    'paid', (remark or '').strip()[:500] or None,
                    datetime.now(), datetime.now()
                ))
                pay_count += 1
        elif total:
            # Just one record for the total
            cur.execute("""
                INSERT INTO payments (
                    candidate_job_id, total_fee, installment_number, amount_due, amount_paid,
                    due_date, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                new_cj_id, total, 1, total, 0, datetime.now().date(),
                'pending', datetime.now(), datetime.now()
            ))
            pay_count += 1

    conn.commit()
    print(f'  candidate_jobs: {cj_count} imported, {cj_skip} skipped')
    print(f'  process_details: {pd_count} created')
    print(f'  payments: {pay_count} created')

    print('\n[12/13] Importing candidate_activities -> CallLog...')
    # Group activities by old candidate_id, sort by created_at, assign attempt numbers
    from collections import defaultdict
    by_candidate = defaultdict(list)
    for act in src_activities:
        by_candidate[act.get('candidate_id')].append(act)

    cl_count = 0
    cl_skip_no_cj = 0
    cl_batch = []
    for old_cand_id, acts in by_candidate.items():
        new_cand_id = old_to_new_candidate.get(old_cand_id)
        if not new_cand_id:
            cl_skip_no_cj += len(acts)
            continue
        new_cj_id = candidate_to_first_cj.get(new_cand_id)
        if not new_cj_id:
            cl_skip_no_cj += len(acts)
            continue
        # Sort by created_at to assign sequential attempt numbers
        acts.sort(key=lambda a: a.get('created_at') or '')
        for idx, act in enumerate(acts, start=1):
            outcome = map_call_outcome(act.get('call_status'))
            notes = (act.get('remarks') or '').strip() or None
            ts = act.get('created_at') or datetime.now()
            cl_batch.append((
                new_cj_id, DEFAULT_USER_ID, ts, outcome, notes,
                None, False, idx, ts,
            ))
            cl_count += 1
            if len(cl_batch) >= 1000:
                execute_values(cur, """
                    INSERT INTO call_logs (
                        candidate_job_id, caller_id, call_timestamp, outcome, notes,
                        follow_up_date, follow_up_reminder_sent, call_attempt_number, created_at
                    ) VALUES %s
                """, cl_batch, page_size=500)
                conn.commit()
                cl_batch = []
    if cl_batch:
        execute_values(cur, """
            INSERT INTO call_logs (
                candidate_job_id, caller_id, call_timestamp, outcome, notes,
                follow_up_date, follow_up_reminder_sent, call_attempt_number, created_at
            ) VALUES %s
        """, cl_batch, page_size=500)
        conn.commit()
    print(f'  call_logs: {cl_count} imported, {cl_skip_no_cj} skipped (candidate has no candidate_job)')

    print('\n[13/13] Final summary')
    print('=' * 60)
    for tbl in [
        'users', 'trades', 'states', 'cities', 'sources', 'companies',
        'candidates', 'jobs', 'candidate_jobs', 'process_details', 'payments', 'call_logs',
    ]:
        cur.execute(f'SELECT COUNT(*) FROM {tbl};')
        print(f'  {tbl:20s} {cur.fetchone()[0]:>8} rows')
    print('=' * 60)
    print('\nLogin: admin@alhiraa.com / Admin@123')

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
