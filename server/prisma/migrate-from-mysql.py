#!/usr/bin/env python3
"""
Migrate data from MySQL SQL dump (excelv4f_alhiraa) to PostgreSQL (alhiraa_atms).
Parses the SQL file and inserts into the running PostgreSQL via psql.
"""

import re
import os
import subprocess
import json
from datetime import datetime

SQL_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'excelv4f_alhiraa (2).sql')
DB_URL = os.environ.get('DATABASE_URL', 'postgresql://alhiraa:alhiraa_dev_2026@localhost:5432/alhiraa_atms')

# Parse DB URL
m = re.match(r'postgresql://(\w+):([^@]+)@([^:]+):(\d+)/(\w+)', DB_URL)
DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME = m.groups()

# Test company names to skip
TEST_COMPANIES = {'TEST COMPANY', 'TRER', 'DRDR', 'TEST COMPANY 1'}

def run_sql(sql, values=None):
    """Execute SQL via psql."""
    cmd = ['docker', 'exec', '-i', 'alhiraa-db', 'psql', '-U', DB_USER, '-d', DB_NAME, '-c', sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 and 'ERROR' in result.stderr:
        print(f"  SQL Error: {result.stderr[:200]}")
    return result

def run_sql_file(filepath):
    """Execute SQL file via psql."""
    with open(filepath) as f:
        sql = f.read()
    cmd = ['docker', 'exec', '-i', 'alhiraa-db', 'psql', '-U', DB_USER, '-d', DB_NAME]
    result = subprocess.run(cmd, input=sql, capture_output=True, text=True)
    if result.returncode != 0 and 'ERROR' in result.stderr:
        print(f"  File SQL Error: {result.stderr[:500]}")
    return result

def parse_inserts(content, table_name):
    """Parse INSERT INTO statements for a table, returning list of tuples."""
    rows = []
    # Find all INSERT blocks for this table
    pattern = rf"INSERT INTO `{table_name}` \(([^)]+)\) VALUES\s*"

    for match in re.finditer(pattern, content):
        cols_str = match.group(1)
        cols = [c.strip().strip('`') for c in cols_str.split(',')]

        # Get the values section (from after VALUES to the semicolon)
        start = match.end()
        # Find the closing semicolon
        depth = 0
        i = start
        while i < len(content):
            if content[i] == '(':
                depth += 1
            elif content[i] == ')':
                depth -= 1
                if depth == 0:
                    # Check if next non-whitespace is , or ;
                    j = i + 1
                    while j < len(content) and content[j] in ' \n\r\t':
                        j += 1
                    if j < len(content) and content[j] == ';':
                        # End of INSERT
                        values_str = content[start:i+1]
                        break
                    elif j < len(content) and content[j] == ',':
                        pass  # continue to next row
            i += 1
        else:
            values_str = content[start:min(start+1000000, len(content))]

        # Parse individual row values - split by "),\n("
        # Remove leading/trailing parens
        values_str = values_str.strip()
        if values_str.startswith('('):
            values_str = values_str[1:]
        if values_str.endswith(')'):
            values_str = values_str[:-1]

        # Split rows by ),\n( pattern
        raw_rows = re.split(r'\),?\s*\n\(', values_str)

        for raw_row in raw_rows:
            raw_row = raw_row.strip()
            if not raw_row:
                continue
            # Parse individual values (handle quoted strings with commas)
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
                if ch in ("'",) and not in_quote:
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

            # Build dict
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
                        except:
                            try:
                                row[col] = float(v)
                            except:
                                row[col] = v
                else:
                    row[col] = None
            rows.append(row)

    return rows

def escape_pg(val):
    """Escape a value for PostgreSQL."""
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return 'TRUE' if val else 'FALSE'
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

def parse_date(val):
    """Parse date from DD-MM-YYYY or YYYY-MM-DD format."""
    if not val:
        return None
    for fmt in ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y']:
        try:
            return datetime.strptime(val, fmt).strftime('%Y-%m-%d')
        except:
            continue
    return None

def map_registration_mode(val):
    """Map MySQL registration mode to Prisma enum."""
    if not val:
        return None
    val = str(val)
    mapping = {
        'CALLING': 'phone',
        'TELECALLING': 'phone',
        'WALK-IN': 'walk_in',
        'WALK IN': 'walk_in',
        'ONLINE': 'online',
        'REFERENCE': 'referral',
        'REFERRAL': 'referral',
        'ASSOCIATE': 'associate',
        'CAMP': 'camp',
        'APP': 'online',
    }
    return mapping.get(val.upper().strip(), 'phone')

def map_english(val):
    """Map English speaking level."""
    if not val:
        return None
    val = str(val)
    mapping = {
        'NONE': 'none',
        'NO': 'none',
        'BASIC': 'basic',
        'GOOD': 'conversational',
        'CONVERSATIONAL': 'conversational',
        'FLUENT': 'fluent',
        'YES': 'basic',
    }
    return mapping.get(val.upper().strip(), None)

def map_gender(val):
    """Map gender value."""
    if not val:
        return None
    val = str(val)
    mapping = {
        'MALE': 'male',
        'FEMALE': 'female',
        'OTHER': 'other',
        'M': 'male',
        'F': 'female',
    }
    return mapping.get(val.upper().strip(), None)

def map_ecr(val):
    """Map ECR type."""
    if not val:
        return None
    val = str(val)
    mapping = {
        'ECR': 'ecr',
        'ECNR': 'ecnr',
    }
    return mapping.get(val.upper().strip(), None)

def map_country(address):
    """Extract Gulf country from company address."""
    if not address:
        return None
    addr = address.upper()
    if 'SAUDI' in addr:
        return 'saudi_arabia'
    if 'UAE' in addr or 'DUBAI' in addr or 'ABU DHABI' in addr:
        return 'uae'
    if 'QATAR' in addr:
        return 'qatar'
    if 'KUWAIT' in addr:
        return 'kuwait'
    if 'BAHRAIN' in addr:
        return 'bahrain'
    if 'OMAN' in addr:
        return 'oman'
    return None

def map_industry(val):
    """Map company industry to Prisma enum."""
    if not val:
        return None
    mapping = {
        'RESTAURANT': 'hospitality',
        'HOSPITALITY': 'hospitality',
        'QSR': 'hospitality',
        'COFFEE SHOP': 'hospitality',
        'CATERING': 'hospitality',
        'FOOD DELIVERY': 'hospitality',
        'FACTORY': 'manufacturing',
        'CONSTRUCTION': 'construction',
        'MEP': 'construction',
        'OIL': 'oil_and_gas',
        'OIL & GAS': 'oil_and_gas',
        'RETAIL': 'hospitality',
        'RETAILS': 'hospitality',
        'IT': 'other',
        'IT RETAIL': 'other',
        'LOGISTIC': 'other',
        'HOUSEKEEPING': 'facilities',
        'MARKETING': 'other',
        'MARKETIN': 'other',
    }
    return mapping.get(val.upper().strip(), 'other')


def main():
    print("=" * 60)
    print("Al-Hiraa MySQL → PostgreSQL Migration")
    print("=" * 60)

    # Read SQL file
    print("\n[1/8] Reading SQL file...")
    with open(SQL_FILE, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    print(f"  Read {len(content):,} bytes")

    # Parse all needed tables
    print("\n[2/8] Parsing tables...")
    positions = parse_inserts(content, 'candidate_positions')
    print(f"  candidate_positions: {len(positions)} rows")

    states = parse_inserts(content, 'states')
    print(f"  states: {len(states)} rows")

    cities = parse_inserts(content, 'cities')
    print(f"  cities: {len(cities)} rows")

    sources = parse_inserts(content, 'sources')
    print(f"  sources: {len(sources)} rows")

    companies = parse_inserts(content, 'companies')
    print(f"  companies: {len(companies)} rows")

    jobs = parse_inserts(content, 'jobs')
    print(f"  jobs: {len(jobs)} rows")

    candidates = parse_inserts(content, 'candidates')
    print(f"  candidates: {len(candidates)} rows")

    # Deduplicate trades by name
    print("\n[3/8] Deduplicating trades...")
    seen_names = set()
    unique_trades = []
    old_trade_id_to_name = {}

    for p in positions:
        name = (p.get('name') or '').strip().upper()
        old_trade_id_to_name[p.get('id')] = name
        if name and name not in seen_names:
            seen_names.add(name)
            unique_trades.append({'name': name, 'is_active': bool(p.get('is_active', 1))})

    print(f"  {len(positions)} → {len(unique_trades)} unique trades")

    # Filter real companies
    real_companies = [c for c in companies if (c.get('company_name') or '').strip().upper() not in {n.upper() for n in TEST_COMPANIES}]
    print(f"  Companies: {len(companies)} → {len(real_companies)} real")

    # Wipe existing data
    print("\n[4/8] Wiping existing PostgreSQL data...")
    wipe_sql = """
    DO $$ BEGIN
        -- Disable triggers
        SET session_replication_role = 'replica';

        -- Delete in order to avoid FK issues
        -- DELETE FROM activity_logs;
        DELETE FROM associate_commissions;
        DELETE FROM fee_change_requests;
        DELETE FROM dropouts;
        DELETE FROM deployments;
        DELETE FROM interview_checkins;
        DELETE FROM interview_events;
        DELETE FROM process_tracking;
        DELETE FROM process_details;
        DELETE FROM payments;
        DELETE FROM call_logs;
        DELETE FROM candidate_jobs;
        DELETE FROM candidates;
        DELETE FROM jobs;
        DELETE FROM companies;
        DELETE FROM referrers;
        DELETE FROM associates;
        DELETE FROM cities;
        DELETE FROM states;
        DELETE FROM trades;
        DELETE FROM sources;
        DELETE FROM users;

        -- Re-enable triggers
        SET session_replication_role = 'origin';
    END $$;
    """
    run_sql(wipe_sql)
    print("  Done - all data wiped")

    # Import system users
    print("\n[5/8] Creating system users...")
    # Use pre-hashed passwords from the existing seed data
    users_sql = """
    INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active, created_at, updated_at) VALUES
    ('admin-001', 'System Admin', 'admin@alhiraa.com', '9999900001', '$2b$10$7Q3ZYLR8MVuF7mGQlqWcYeJA0V9OuT4TtQQvPxfHYdC9N5X1nK2Uy', 'admin', true, NOW(), NOW()),
    ('dataentry-001', 'Data Entry User', 'dataentry@alhiraa.com', '9999900002', '$2b$10$JUGnZp94oHoiCVZQPNdBYOQVlCPHVGeFZYnGfKvGFSxFnVUr.JDXK', 'data_entry', true, NOW(), NOW()),
    ('recruiter-001', 'Recruiter User', 'recruiter@alhiraa.com', '9999900003', '$2b$10$JUGnZp94oHoiCVZQPNdBYOQVlCPHVGeFZYnGfKvGFSxFnVUr.JDXK', 'recruiter', true, NOW(), NOW()),
    ('manager-001', 'Manager User', 'manager@alhiraa.com', '9999900004', '$2b$10$JUGnZp94oHoiCVZQPNdBYOQVlCPHVGeFZYnGfKvGFSxFnVUr.JDXK', 'manager', true, NOW(), NOW()),
    ('procmgr-001', 'Process Manager', 'process@alhiraa.com', '9999900005', '$2b$10$JUGnZp94oHoiCVZQPNdBYOQVlCPHVGeFZYnGfKvGFSxFnVUr.JDXK', 'process_manager', true, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
    """
    run_sql(users_sql)
    print("  Created 5 system users")

    # Import trades
    print("\n[6/8] Importing master data...")

    # Trades
    batch = []
    for t in unique_trades:
        batch.append(f"({escape_pg(t['name'])}, {'TRUE' if t['is_active'] else 'FALSE'}, NOW())")

    # Insert in batches of 100
    for i in range(0, len(batch), 100):
        chunk = batch[i:i+100]
        sql = f"INSERT INTO trades (name, is_active, created_at) VALUES {','.join(chunk)};"
        run_sql(sql)
    print(f"  Trades: {len(unique_trades)} inserted")

    # Build trade name→new_id map
    result = subprocess.run(
        ['docker', 'exec', '-i', 'alhiraa-db', 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c',
         'SELECT id, name FROM trades;'],
        capture_output=True, text=True
    )
    trade_name_to_new_id = {}
    for line in result.stdout.strip().split('\n'):
        if '|' in line:
            tid, tname = line.split('|', 1)
            trade_name_to_new_id[tname.strip().upper()] = int(tid)

    # Build old_trade_id → new_trade_id map
    old_to_new_trade = {}
    for old_id, name in old_trade_id_to_name.items():
        if name in trade_name_to_new_id:
            old_to_new_trade[old_id] = trade_name_to_new_id[name]

    # States
    batch = []
    for s in states:
        batch.append(f"({s['id']}, {escape_pg(s['name'])}, NOW())")
    if batch:
        sql = f"INSERT INTO states (id, name, created_at) VALUES {','.join(batch)} ON CONFLICT (id) DO NOTHING;"
        run_sql(sql)
    print(f"  States: {len(states)} inserted")

    # Reset state sequence
    run_sql("SELECT setval('states_id_seq', (SELECT MAX(id) FROM states));")

    # Cities - insert in batches
    batch = []
    for c in cities:
        sid = c.get('state_id')
        if sid is None:
            continue
        batch.append(f"({c['id']}, {escape_pg(c['name'])}, {sid}, NOW())")

    for i in range(0, len(batch), 500):
        chunk = batch[i:i+500]
        sql = f"INSERT INTO cities (id, name, state_id, created_at) VALUES {','.join(chunk)} ON CONFLICT (id) DO NOTHING;"
        run_sql(sql)
    print(f"  Cities: {len(batch)} inserted")

    # Reset city sequence
    run_sql("SELECT setval('cities_id_seq', (SELECT MAX(id) FROM cities));")

    # Sources
    batch = []
    for s in sources:
        batch.append(f"({s['id']}, {escape_pg(s['name'])}, NOW())")
    if batch:
        sql = f"INSERT INTO sources (id, name, created_at) VALUES {','.join(batch)} ON CONFLICT (id) DO NOTHING;"
        run_sql(sql)
    print(f"  Sources: {len(sources)} inserted")
    run_sql("SELECT setval('sources_id_seq', (SELECT MAX(id) FROM sources));")

    # Companies
    old_to_new_company = {}
    for c in real_companies:
        name = (c.get('company_name') or '').strip()
        country = map_country(c.get('company_address'))
        industry = map_industry(c.get('company_industry'))
        status = 'active' if c.get('status') == 1 else 'inactive'

        sql = f"""INSERT INTO companies (name, country, industry, phone, email, status, created_at, updated_at)
        VALUES ({escape_pg(name)}, {escape_pg(country)}, {escape_pg(industry)},
                {escape_pg(c.get('company_phone'))}, {escape_pg(c.get('company_email'))},
                {escape_pg(status)},
                {escape_pg(c.get('created_at'))}, {escape_pg(c.get('updated_at'))})
        RETURNING id;"""

        result = subprocess.run(
            ['docker', 'exec', '-i', 'alhiraa-db', 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c', sql],
            capture_output=True, text=True
        )
        new_id = result.stdout.strip().split('\n')[0].strip()
        if new_id and new_id.isdigit():
            old_to_new_company[c.get('id')] = int(new_id)

    print(f"  Companies: {len(old_to_new_company)} inserted")

    # Build source name→id map
    source_name_to_id = {}
    for s in sources:
        source_name_to_id[(s.get('name') or '').upper().strip()] = s['id']

    # Import candidates
    print("\n[7/8] Importing candidates (this may take a while)...")

    batch_sql = []
    imported = 0
    skipped = 0

    for cand in candidates:
        full_name = (cand.get('full_name') or '').strip()
        if not full_name:
            skipped += 1
            continue

        whatsapp = (cand.get('whatapp_no') or cand.get('contact_no') or '').strip()
        if not whatsapp:
            skipped += 1
            continue

        # Map fields
        gender = map_gender(cand.get('gender'))
        dob = parse_date(cand.get('date_of_birth'))
        ecr = map_ecr(cand.get('ecr_type'))
        english = map_english(cand.get('english_speak'))
        arabic = str(cand.get('arabic_speak', '')).upper() in ('YES', 'TRUE', '1')
        gulf_return = bool(cand.get('return'))
        reg_mode = map_registration_mode(cand.get('mode_of_registration'))

        # Position lookups
        pos1_old = cand.get('position_applied_for_1')
        pos2_old = cand.get('position_applied_for_2')
        pos3_old = cand.get('position_applied_for_3')
        pos1_id = old_to_new_trade.get(pos1_old) if pos1_old else None
        pos2_id = old_to_new_trade.get(pos2_old) if pos2_old else None
        pos3_id = old_to_new_trade.get(pos3_old) if pos3_old else None

        # Source lookup
        source_name = (cand.get('source') or '').upper().strip()
        source_id = source_name_to_id.get(source_name)

        state_id = cand.get('state_id')
        # Validate state_id exists (we only have 41 states with IDs 1-41)
        if state_id is not None and (not isinstance(state_id, int) or state_id > 41 or state_id < 1):
            state_id = None
        education = (cand.get('education') or '').strip() or None
        passport = (cand.get('passport_number') or '').strip() or None
        email = (cand.get('email') or '').strip() or None
        alt_contact = (cand.get('alternate_contact_no') or '').strip() or None
        religion = (cand.get('religion') or '').strip() or None
        indian_exp = (cand.get('indian_exp') or '').strip() or None
        abroad_exp = (cand.get('abroad_exp') or '').strip() or None
        education_other = (cand.get('other_education') or '').strip() or None
        remarks = None

        created_at = cand.get('created_at') or 'NOW()'

        row = f"""({escape_pg(full_name)}, {escape_pg(whatsapp)}, {escape_pg(gender)},
            {'NULL' if not dob else escape_pg(dob) + '::date'},
            {escape_pg(passport)}, {escape_pg(ecr)},
            {'NULL' if not state_id else state_id},
            {escape_pg(education)}, {escape_pg(education_other)},
            {escape_pg(english)}, {'TRUE' if arabic else 'FALSE'},
            {'TRUE' if gulf_return else 'FALSE'},
            {escape_pg(indian_exp)}, {escape_pg(abroad_exp)},
            {'NULL' if not pos1_id else pos1_id}, {'NULL' if not pos2_id else pos2_id}, {'NULL' if not pos3_id else pos3_id},
            {escape_pg(reg_mode)}, {'NULL' if not source_id else source_id},
            {escape_pg(alt_contact)}, {escape_pg(email)}, {escape_pg(religion)},
            'admin-001', 'complete', '{{}}', '{{}}',
            {escape_pg(created_at) if created_at != 'NOW()' else 'NOW()'}, NOW())"""

        batch_sql.append(row)
        imported += 1

        if len(batch_sql) >= 200:
            cols = """(full_name, whatsapp_no, gender, dob, passport_no, ecr_type,
                      state_id, education, education_other, english_speaking, arabic_speaking,
                      gulf_return, indian_experience, abroad_experience,
                      position_1_id, position_2_id, position_3_id,
                      registration_mode, source_id, alternate_contact, email, religion,
                      registered_by, completion_status, indian_driving_license, gulf_driving_license,
                      created_at, updated_at)"""
            sql = f"INSERT INTO candidates {cols} VALUES {','.join(batch_sql)} ON CONFLICT DO NOTHING;"
            run_sql(sql)
            batch_sql = []
            if imported % 2000 == 0:
                print(f"  ... {imported} candidates imported")

    # Insert remaining
    if batch_sql:
        cols = """(full_name, whatsapp_no, gender, dob, passport_no, ecr_type,
                  state_id, education, education_other, english_speaking, arabic_speaking,
                  gulf_return, indian_experience, abroad_experience,
                  position_1_id, position_2_id, position_3_id,
                  registration_mode, source_id, alternate_contact, email, religion,
                  registered_by, completion_status, indian_driving_license, gulf_driving_license,
                  created_at, updated_at)"""
        sql = f"INSERT INTO candidates {cols} VALUES {','.join(batch_sql)} ON CONFLICT DO NOTHING;"
        run_sql(sql)

    print(f"  Candidates: {imported} imported, {skipped} skipped (no name/phone)")

    # Import jobs
    print("\n[8/8] Importing jobs...")
    job_count = 0
    for job in jobs:
        company_old_id = job.get('company_id')
        company_new_id = old_to_new_company.get(company_old_id)
        if not company_new_id:
            continue  # Skip jobs for test companies

        trade_old_id = job.get('candidate_position_id')
        trade_new_id = old_to_new_trade.get(trade_old_id)
        if not trade_new_id:
            # Try to use first available trade
            trade_new_id = list(trade_name_to_new_id.values())[0] if trade_name_to_new_id else None
        if not trade_new_id:
            continue

        title = (job.get('job_name') or '').strip()
        if not title:
            # Use trade name as title
            trade_name = old_trade_id_to_name.get(trade_old_id, 'General')
            title = trade_name.title()

        positions_req = 1
        try:
            positions_req = int(job.get('quantity_of_people_required', 1))
        except:
            pass

        salary = 0
        try:
            sal_str = str(job.get('salary', '0')).replace(',', '')
            # Handle "700+300" format
            salary = sum(float(x) for x in sal_str.split('+') if x.strip())
        except:
            pass

        service_fee = 0
        try:
            service_fee = float(str(job.get('service_charge', '0')).replace(',', ''))
        except:
            pass

        status = 'closed' if (job.get('status') or '').lower() == 'closed' else 'open'
        country = map_country(job.get('address'))

        sql = f"""INSERT INTO jobs (company_id, trade_id, title, positions_required,
                  salary_min, service_fee, status, country, created_by, created_at, updated_at)
        VALUES ({company_new_id}, {trade_new_id}, {escape_pg(title)}, {positions_req},
                {salary}, {service_fee}, {escape_pg(status)}, {escape_pg(country)},
                'admin-001', {escape_pg(job.get('created_at'))}, {escape_pg(job.get('updated_at'))});"""
        run_sql(sql)
        job_count += 1

    print(f"  Jobs: {job_count} imported")

    # Final stats
    print("\n" + "=" * 60)
    print("Migration complete! Summary:")

    for table in ['trades', 'states', 'cities', 'sources', 'companies', 'candidates', 'jobs', 'users']:
        result = subprocess.run(
            ['docker', 'exec', '-i', 'alhiraa-db', 'psql', '-U', DB_USER, '-d', DB_NAME, '-t', '-A', '-c',
             f'SELECT COUNT(*) FROM {table};'],
            capture_output=True, text=True
        )
        count = result.stdout.strip()
        print(f"  {table}: {count} rows")

    print("=" * 60)


if __name__ == '__main__':
    main()
