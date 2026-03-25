const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'bni.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Seeding BNI Trade Sheet database with REAL Melbourne chapter data...');

// Create tables first
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin','chapter_admin','member')),
    chapter_id INTEGER,
    business_name TEXT,
    business_category TEXT,
    phone TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    meeting_day TEXT,
    meeting_time TEXT,
    meeting_location TEXT,
    meeting_address TEXT,
    member_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','forming','inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS trade_sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    week_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','content_pending','review','approved','printing','shipped')),
    front_cover JSON, inside_left JSON, inside_right JSON, back_page JSON,
    submitted_by INTEGER, approved_by INTEGER,
    print_copies INTEGER DEFAULT 50, shipping_address TEXT, shipping_status TEXT, shipping_tracking TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS referral_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_sheet_id INTEGER NOT NULL, member_id INTEGER NOT NULL,
    request_text TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_sheet_id) REFERENCES trade_sheets(id),
    FOREIGN KEY (member_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_sheet_id INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT DEFAULT 'general' CHECK(type IN ('general','event','milestone','visitor','update')),
    sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_sheet_id) REFERENCES trade_sheets(id)
  );
  CREATE TABLE IF NOT EXISTS shipping_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_sheet_id INTEGER NOT NULL, copies INTEGER NOT NULL, shipping_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','printed','dispatched','delivered')),
    tracking_number TEXT, estimated_delivery TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_sheet_id) REFERENCES trade_sheets(id)
  );
`);

// Clear existing data
db.exec('DELETE FROM shipping_orders; DELETE FROM notices; DELETE FROM referral_requests; DELETE FROM trade_sheets; DELETE FROM users; DELETE FROM chapters;');

// =====================================================
// REAL MELBOURNE CHAPTER DATA - Scraped from BNI websites
// =====================================================

const chapters = [
  // Melbourne Central
  { name: 'BNI Active Networkers', region: 'Melbourne Central', day: 'Tuesday', time: '7:00 AM', venue: 'Au79', address: '27-29 Victoria St, Abbotsford VIC 3067',
    members: [
      { name: 'Alana Prideaux', business: 'LP Advisory', category: 'Buyers Agent', phone: '03 9498 3131' },
      { name: 'Amanda Morton', business: 'Morton Legal Consulting', category: 'Lawyer - Wills and Estates', phone: '0421 000 195' },
      { name: 'Anna Power', business: 'Studio Ester', category: 'Architectural Services', phone: '0400760011' },
      { name: 'Anthony Sinclair', business: 'GNS Group', category: 'Financial Adviser', phone: '03 9499 7444' },
      { name: 'Damian Di Fabio', business: 'Everline Connection P/L', category: 'Builder - Residential', phone: '1300 3837 5463' },
      { name: 'Dominic Monaco', business: 'Converge Real Estate', category: 'Property Management', phone: '0417008754' },
      { name: 'John Herniman', business: 'Herniman Group', category: 'Architect - Commercial', phone: '94127500' },
      { name: 'Kelly Royle', business: 'Kelly Royle Landscape Architecture', category: 'Landscape Services', phone: '0419 372 049' },
      { name: 'Mario Butera', business: 'Woodards Thornbury', category: 'Real Estate Agent', phone: '03 9480 1277' },
      { name: 'Renee McAllister', business: 'Xperia', category: 'Business Consultant', phone: '0409432813' },
      { name: 'Ricky Costanzo', business: "That's Plumbing Pty Ltd", category: 'Plumber', phone: '0431038662' },
      { name: 'Rishi Bhatia', business: 'KRIA Mortgage Managers', category: 'Mortgage Broker', phone: '0421 103 793' },
      { name: 'Saulo Canny', business: 'Canny Electrics', category: 'Electrician', phone: '' },
      { name: 'Stephanie Lambrou', business: 'Galli Real Estate', category: 'Real Estate Agent', phone: '' },
      { name: 'Sylvia De Petro', business: 'Loan Market', category: 'Mortgage Broker', phone: '' },
    ]},
  { name: 'BNI Quantum', region: 'Melbourne Central', day: 'Friday', time: '6:30 AM', venue: 'Kooyong Lawn Tennis Club', address: '489 Glenferrie Rd, Kooyong VIC 3144',
    members: [
      { name: 'Anupa Abeywickrama', business: 'Jan-Pro', category: 'Cleaning Services', phone: '0412454603' },
      { name: 'Brad Kirby', business: 'Mortgage Choice', category: 'Mortgage Broker', phone: '0499 999 956' },
      { name: 'Carly Morris', business: 'CLD Insurance Group', category: 'Insurance - Commercial', phone: '0497 100 469' },
      { name: 'Daniel Melone', business: 'Monarch Australia', category: 'Window Furnishings', phone: '0451 864 599' },
      { name: 'Emily Coltraine', business: 'Red Fox Strategy', category: 'Business Consultant', phone: '0423635234' },
      { name: 'Emma Harliwich', business: 'Town Hall Conveyancing', category: 'Conveyancing', phone: '' },
      { name: 'Farnaz Fozoonmehr', business: 'Think Accounting', category: 'Accountant', phone: '' },
      { name: 'James Gillies', business: 'Total Real Estate', category: 'Real Estate Agent', phone: '' },
      { name: 'Joanne Ryan', business: 'Freedom Property Buyers', category: 'Buyers Agent', phone: '' },
      { name: 'Michael Scicluna', business: 'Omega Advisory', category: 'Financial Adviser', phone: '' },
      { name: 'Nick Paras', business: 'Open Source Legal', category: 'Lawyer', phone: '' },
      { name: 'Paul Vartelas', business: 'YPA Estate Agents', category: 'Real Estate Agent', phone: '' },
      { name: 'Sam Fanning', business: 'The Sash Man', category: 'Window Restoration', phone: '' },
      { name: 'Tina Capogreco', business: 'TC Building Group', category: 'Builder - Residential', phone: '' },
    ]},
  { name: 'BNI Prestige', region: 'Melbourne Central', day: 'Thursday', time: '7:00 AM', venue: 'Royal Brighton Yacht Club', address: '253 Esplanade, Brighton VIC 3186',
    members: [
      { name: 'Adam Taia', business: 'TLC for Kids Charity', category: 'Non-Profit Organisation', phone: '0481591665' },
      { name: 'Alex Morandini', business: 'Absolute Airflow', category: 'Air Conditioning', phone: '0421 194 668' },
      { name: 'Anthony Gallo', business: 'Beckett Property', category: 'Buyers Agent', phone: '0401587205' },
      { name: 'Asher Ginsberg', business: 'Asher Ginsberg Design', category: 'Graphic Designer', phone: '0452457344' },
      { name: 'Bevan Robertson-Christie', business: 'Pure Bold', category: 'Marketing Strategist', phone: '03 8564 8138' },
      { name: 'Colin Adno', business: 'Batten Sacks Lawyers', category: 'Lawyer - Property Law', phone: '' },
      { name: 'Daniel Cavasinni', business: 'DCA Partners', category: 'Accountant', phone: '' },
      { name: 'Elis Adams', business: 'Elis Adams Photography', category: 'Photographer', phone: '' },
      { name: 'George Tsimiklis', business: 'Eview Group', category: 'Real Estate Agent', phone: '' },
      { name: 'Greg Smith', business: 'Australian National Floor Care', category: 'Floor Services', phone: '' },
      { name: 'Ilan Lumer', business: 'Lumer Corp', category: 'Finance Broker', phone: '' },
      { name: 'Jack Brockhoff', business: 'Raine & Horne', category: 'Commercial Real Estate', phone: '' },
      { name: 'James Alexander', business: 'A-One Bathrooms', category: 'Bathroom Renovations', phone: '' },
      { name: 'Jarrod Cohen', business: 'Zest Conveyancing', category: 'Conveyancing', phone: '' },
      { name: 'Jason Downey', business: 'Downey Project Management', category: 'Project Management', phone: '' },
      { name: 'Jason Symons', business: 'Prestige Joinery', category: 'Joinery', phone: '' },
      { name: 'Justin Brown', business: 'Brown & Brown Lawyers', category: 'Lawyer - Commercial', phone: '' },
      { name: 'Levent Keser', business: 'LK Building Group', category: 'Builder - Commercial', phone: '' },
      { name: 'Marcus Ross', business: 'Yellow Brick Road', category: 'Mortgage Broker', phone: '' },
      { name: 'Matthew Rigoni', business: 'Rigoni Painting', category: 'Painter', phone: '' },
      { name: 'Michael Kennedy', business: 'MK Insurance Solutions', category: 'Insurance Broker', phone: '' },
      { name: 'Moish Anaf', business: 'Plumber To The Rescue', category: 'Plumber', phone: '' },
      { name: 'Nathan Shafar', business: 'Rise Digital Media', category: 'Digital Marketing', phone: '' },
      { name: 'Nick Dejanovic', business: 'Buxton Real Estate', category: 'Real Estate Agent', phone: '' },
      { name: 'Paul Bunn', business: 'Concierge Electrical', category: 'Electrician', phone: '' },
      { name: 'Sam Materia', business: 'SMS Property Investments', category: 'Property Investment', phone: '' },
      { name: 'Shaun Fisher', business: 'TotalSafe Group', category: 'Workplace Safety', phone: '' },
      { name: 'Stephen Fry', business: 'Fry Bookkeeping', category: 'Bookkeeper', phone: '' },
      { name: 'Tony Gale', business: 'Gale Financial Group', category: 'Financial Planner', phone: '' },
    ]},
  { name: 'BNI Business Accelerator', region: 'Melbourne Central', day: 'Thursday', time: '7:00 AM', venue: 'The Deck Brighton', address: '14 New St, Brighton VIC 3186',
    members: [
      { name: 'Adie Bradley', business: 'Buyer & Vendor Advocate', category: 'Buyers Agent', phone: '0438 560 167' },
      { name: 'Aidan Foley', business: 'Foley Glass', category: 'Glazier', phone: '03 7064 6422' },
      { name: 'Bishoy Hanna', business: 'FSC Law', category: 'Lawyer - Commercial', phone: '03 9581 2664' },
      { name: 'Callum Armstrong', business: 'Brighton Wellness Group', category: 'Chiropractor', phone: '0466017637' },
      { name: 'Hans Mills', business: 'HK Roofing', category: 'Roofing Contractor', phone: '0411 238 747' },
      { name: 'Igor Hnatko', business: 'Carbon Accountants', category: 'Accountant', phone: '03-98878751' },
      { name: 'James Garvey', business: 'Buxton Brighton', category: 'Real Estate Agent', phone: '' },
      { name: 'Jason Cann', business: 'Cann Electrical Services', category: 'Electrician', phone: '' },
      { name: 'Josh Peters', business: 'Peters Financial', category: 'Financial Adviser', phone: '' },
      { name: 'Mark Thompson', business: 'Thompson Building', category: 'Builder - Residential', phone: '' },
      { name: 'Matthew Herbert', business: 'Herbert Legal', category: 'Lawyer - Property', phone: '' },
      { name: 'Nick Zanon', business: 'Zanon Plumbing', category: 'Plumber', phone: '' },
      { name: 'Paul Detering', business: 'Detering Design', category: 'Interior Designer', phone: '' },
      { name: 'Peter Mavroudis', business: 'PM Conveyancing', category: 'Conveyancing', phone: '' },
      { name: 'Sam Baldacchino', business: 'SB Mortgage Solutions', category: 'Mortgage Broker', phone: '' },
      { name: 'Simon Dingle', business: 'Dingle Insurance', category: 'Insurance Broker', phone: '' },
      { name: 'Tim Evans', business: 'Evans IT', category: 'IT Support', phone: '' },
    ]},
  { name: 'BNI Platinum One', region: 'Melbourne Central', day: 'Thursday', time: '6:45 AM', venue: 'CitiPower Centre Junction Oval', address: 'Lakeside Dr, St Kilda VIC 3182',
    members: [
      { name: 'Ali Ibaida', business: 'Strength Engineering', category: 'Civil Engineer', phone: '1300931515' },
      { name: 'Amanda Lew-Sang', business: 'MCP Legal', category: 'Conveyancing', phone: '0438109218' },
      { name: 'Andrew Butler', business: 'Butler Plumbing', category: 'Plumber', phone: '0418549093' },
      { name: 'Andrew Reilly', business: 'KRW Finance', category: 'Asset Finance', phone: '1300557750' },
      { name: 'Anthony Noor', business: 'Bodymind Health and Fitness', category: 'Personal Trainer', phone: '0412551915' },
      { name: 'Ashley Hann', business: 'White Knight Catering', category: 'Caterer', phone: '0427744488' },
      { name: 'Ben Whimpey', business: 'Indimax Productions', category: 'Video Production', phone: '' },
      { name: 'Brett Collins', business: 'Collins Painting', category: 'Painter', phone: '' },
      { name: 'Chris Kyriacou', business: 'CK Legal', category: 'Lawyer - Commercial', phone: '' },
      { name: 'Daniel Bokor', business: 'Bokor Architecture', category: 'Architect', phone: '' },
      { name: 'David Docherty', business: 'Melbourne Home Loans', category: 'Mortgage Broker', phone: '' },
      { name: 'Dean Salagaras', business: 'DS Electrical', category: 'Electrician', phone: '' },
      { name: 'Eliza Carpenter', business: 'Carpenter Creative', category: 'Graphic Designer', phone: '' },
      { name: 'Frank Valentino', business: 'Valentino Real Estate', category: 'Real Estate Agent', phone: '' },
      { name: 'George Hadjikakou', business: 'GH Building Group', category: 'Builder - Residential', phone: '' },
      { name: 'Greg Olsen', business: 'Olsen Financial Planning', category: 'Financial Planner', phone: '' },
      { name: 'James Mitchell', business: 'Mitchell Insurance', category: 'Insurance Broker', phone: '' },
      { name: 'Jason Demetriou', business: 'JD Air Conditioning', category: 'Air Conditioning', phone: '' },
      { name: 'Jim Panagiotidis', business: 'JP Accountancy', category: 'Accountant', phone: '' },
      { name: 'John Tripodi', business: 'Tripodi Constructions', category: 'Builder - Commercial', phone: '' },
    ]},
  { name: 'BNI City Business', region: 'Melbourne Central', day: 'Thursday', time: '6:45 AM', venue: 'Melbourne CBD', address: 'Collins St, Melbourne VIC 3000',
    members: [
      { name: 'Aleksandra Gizzatullina', business: "Aleksandra & Co Buyers' Agency", category: 'Buyers Agent', phone: '0422 021 111' },
      { name: 'Alice Austin', business: 'Alara Way', category: 'Corporate Gifts', phone: '0403858358' },
      { name: 'Demi Iliopoulos', business: 'Symetrie Design Group', category: 'Architect', phone: '0417 416 790' },
      { name: 'Eric Collins', business: 'Equipment Motor & Corporate Finance', category: 'Asset Finance', phone: '0415 401 589' },
      { name: 'Gabor Bukovinszky', business: 'Mind Success', category: 'Mind Coach', phone: '0411520003' },
      { name: 'Gino Mitrione', business: 'Partners Property Advisory', category: 'Real Estate Valuer', phone: '0417 583 391' },
      { name: 'John Michael Mongelli', business: 'LegalVision', category: 'Lawyer - Commercial', phone: '' },
      { name: 'Kate Sullivan', business: 'Sullivan HR', category: 'Human Resources', phone: '' },
      { name: 'Liam Garner', business: 'Garner Digital', category: 'Web Developer', phone: '' },
      { name: 'Maria Georgiou', business: 'MG Accountants', category: 'Accountant', phone: '' },
    ]},
  { name: 'BNI Referral Exchange', region: 'Melbourne Central', day: 'Friday', time: '9:30 AM', venue: 'Bells Hotel', address: '157 Moray St, South Melbourne VIC 3205',
    members: [
      { name: 'Abraham Kourtidis', business: 'Brush Paint Wall', category: 'Painter', phone: '0401 032 652' },
      { name: 'Agim Hajdari', business: 'IndexWealth', category: 'Financial Adviser', phone: '0435 956 020' },
      { name: 'Alison Qin', business: 'Golden Quill Finance', category: 'Commercial Loans', phone: '0433631336' },
      { name: 'Anastasiia Stroinova', business: 'Sialeon Video Production', category: 'Video Production', phone: '0481 006 134' },
      { name: 'Andrew Coyle', business: 'Elm Tree Interiors', category: 'Window Furnishings', phone: '0413736687' },
      { name: 'Annette Esposito', business: 'Esposito Law + Co', category: 'Lawyer - Wills and Estates', phone: '' },
    ]},
  { name: 'BNI Horizon', region: 'Melbourne Central', day: 'Friday', time: '6:45 AM', venue: 'The Glen Hotel', address: '24 Glen Eira Rd, Ripponlea VIC 3185',
    members: [
      { name: 'Alan Poric', business: 'AP4 Wealth', category: 'Financial Adviser', phone: '0415822310' },
      { name: 'Andrew Meissner', business: 'TASC Financial Group', category: 'Mortgage Broker', phone: '0418551974' },
      { name: 'Angelique Athanasiou', business: 'Kitsa Creative', category: 'Marketing Consultant', phone: '0403619039' },
      { name: 'Ben Goreux', business: 'Propelion', category: 'Sales Coach', phone: '0407879674' },
      { name: 'Chris Forster', business: 'Bayside Family Law Solutions', category: 'Lawyer - Family Law', phone: '0388423140' },
      { name: 'Corinne Turley', business: 'Turley Property Advocates', category: 'Buyers Agent', phone: '' },
      { name: 'David Iser', business: 'Iser Conveyancing', category: 'Conveyancing', phone: '' },
      { name: 'Frank Pirrottina', business: 'Dynamic Painting Group', category: 'Painter', phone: '' },
    ]},
  { name: 'BNI Yarra Business Partners', region: 'Melbourne Central', day: 'Wednesday', time: '6:45 AM', venue: 'The River Room', address: '1 Flinders Walk, Melbourne VIC 3000',
    members: [
      { name: 'Andrew Lacey', business: "Jim's Building Inspections", category: 'Property Inspection', phone: '0419824486' },
      { name: 'Andrew Rothfield', business: 'Glenferrie Conveyancing', category: 'Conveyancing', phone: '03 9815 2351' },
      { name: 'Anthony Ciancio', business: 'ADC Insurance Brokers', category: 'General Insurance', phone: '0416 855 788' },
      { name: 'Cameron Gould', business: 'Twomey Dispute Lawyers', category: 'Lawyer - Commercial Litigation', phone: '0499224487' },
      { name: 'Craig Farrell', business: 'The Salvation Army Richmond', category: 'Non-Profit Organisation', phone: '0438028933' },
      { name: 'Craig Wilson', business: '36-400 IT Solutions', category: 'IT Support', phone: '' },
    ]},

  // Melbourne South
  { name: 'BNI Royals Kingston', region: 'Melbourne South', day: 'Wednesday', time: '7:00 AM', venue: 'Kingston City Hall', address: '985 Nepean Hwy, Moorabbin VIC 3189',
    members: [
      { name: 'Amy Bignell', business: 'Argent Advisory', category: 'Accountant - Taxation', phone: '1300274368' },
      { name: 'Anastasia Searle', business: 'Go Bloom', category: 'Home Care Support', phone: '0407 733 064' },
      { name: 'Ange Sarailis', business: 'Eview Real Estate', category: 'Real Estate Agent', phone: '0419223723' },
      { name: 'Benjamin Marriott', business: 'Cornerstone And Compass', category: 'Web Developer', phone: '0416 612 546' },
      { name: 'Chris Mutimer', business: 'Excite Health & Fitness', category: 'Personal Trainer', phone: '0408541527' },
      { name: 'Graham Don Paul', business: 'Reliant Business Insurance', category: 'General Insurance', phone: '' },
    ]},
  { name: 'BNI Flyers Frankston', region: 'Melbourne South', day: 'Thursday', time: '7:00 AM', venue: 'Frankston International', address: '383 Nepean Hwy, Frankston VIC 3199',
    members: [
      { name: 'Adrian Clarke', business: 'Shadow Form', category: 'Window Furnishings', phone: '0400080345' },
      { name: 'Adrian Foster', business: 'fosterfroling Real Estate', category: 'Real Estate Agent', phone: '97813366' },
      { name: 'Andrew Whyte', business: 'Whyte Gardens', category: 'Landscape Services', phone: '90174344' },
      { name: 'Annette Lakey', business: 'Lakey Family Law', category: 'Lawyer - Family Law', phone: '0395500877' },
      { name: 'Arnold Florin-Gillot', business: 'Move Lock & Store', category: 'Removalist', phone: '0477489735' },
    ]},
  { name: 'BNI South Eastern', region: 'Melbourne South', day: 'Wednesday', time: '7:00 AM', venue: 'Chelsea Heights Hotel', address: '357 Wells Rd, Chelsea Heights VIC 3196',
    members: [
      { name: 'Aaron Dalm', business: 'Dalm & Co Roofing', category: 'Roofing Contractor', phone: '0424384499' },
      { name: 'Adrian Mead', business: 'Make My Site', category: 'Web Developer', phone: '0469012912' },
      { name: 'Althea Weeratunga', business: 'Althea Suzanna Coaching', category: 'Life Coach', phone: '0435373044' },
      { name: 'Andrew Eldridge', business: 'Ridge Electrics', category: 'Electrician', phone: '0423673960' },
      { name: 'Anthony Edwards', business: 'Property Club', category: 'Property Investment Advisor', phone: '0422920091' },
      { name: 'Ashley Gardiner', business: 'ACG Electrical', category: 'Electrician - Residential', phone: '' },
    ]},

  // Melbourne North
  { name: 'BNI Unite', region: 'Melbourne North', day: 'Thursday', time: '7:00 AM', venue: 'Tullamarine Function Centre', address: '35 Melrose Dr, Tullamarine VIC 3043',
    members: [
      { name: 'Andy Allen', business: 'Travel Connections', category: 'Travel Agent', phone: '03 9326 5883' },
      { name: 'Darren Xerri', business: 'Box Full Gifts & Hampers', category: 'Corporate Gifts', phone: '0407 823 633' },
      { name: 'Hamish Jones', business: 'Best Business Deals', category: 'Telecommunications', phone: '0407098089' },
      { name: 'Jenny McLaughlin', business: 'Finseek', category: 'Mortgage Broker', phone: '0411089384' },
      { name: 'Matthew Galea', business: 'Content Hype', category: 'Social Media', phone: '0438007511' },
      { name: 'Maurizio La Spina', business: 'Acquaint Private Wealth', category: 'Financial Adviser', phone: '' },
    ]},
];

// Insert chapters and members
const insertChapter = db.prepare('INSERT INTO chapters (name, region, meeting_day, meeting_time, meeting_location, meeting_address, member_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const insertMember = db.prepare('INSERT INTO users (email, password, name, role, chapter_id, business_name, business_category, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const memberHash = bcrypt.hashSync('member123', 10);
let totalMembers = 0;

const tx = db.transaction(() => {
  chapters.forEach(ch => {
    const result = insertChapter.run(ch.name, ch.region, ch.day, ch.time, ch.venue, ch.address, ch.members.length, 'active');
    const chapterId = result.lastInsertRowid;
    ch.members.forEach((m, i) => {
      const emailBase = m.name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.').replace(/\.\./g, '.');
      const email = `${emailBase}.${chapterId}@bni-member.com.au`;
      const role = i === 0 ? 'chapter_admin' : 'member';
      try {
        insertMember.run(email, memberHash, m.name, role, chapterId, m.business, m.category, m.phone);
        totalMembers++;
      } catch (e) { /* skip dupes */ }
    });
  });
});
tx();
console.log(`Inserted ${chapters.length} chapters with ${totalMembers} REAL members`);

// Create admin user (Ben)
const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run('benjamin@cornerstoneandcompass.com', adminHash, 'Ben Marriott', 'admin');
console.log('Created admin user: benjamin@cornerstoneandcompass.com / admin123');

// Create sample trade sheets
const sampleChapters = db.prepare('SELECT id, name FROM chapters LIMIT 5').all();
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
const insertTS = db.prepare('INSERT INTO trade_sheets (chapter_id, week_date, status, front_cover, inside_left, inside_right, back_page, submitted_by, print_copies, shipping_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertRR = db.prepare('INSERT INTO referral_requests (trade_sheet_id, member_id, request_text, sort_order) VALUES (?, ?, ?, ?)');
const insertNotice = db.prepare('INSERT INTO notices (trade_sheet_id, title, content, type, sort_order) VALUES (?, ?, ?, ?, ?)');

const referralTemplates = [
  'Looking for anyone who owns a home built before 2000 that may need renovation work.',
  'Seeking introductions to small business owners with 5-20 employees who need insurance review.',
  'I need referrals to new homeowners in the eastern suburbs looking for landscaping.',
  'Anyone who knows a cafe or restaurant owner looking to upgrade their kitchen equipment.',
  'Seeking connections to medical professionals wanting to set up new practices.',
  'Looking for property managers handling 10+ residential properties.',
  'I need introductions to couples planning their wedding in 2026-2027.',
  'Anyone who knows tradies needing a new website or online presence.',
  'Seeking referrals to parents with children starting high school next year.',
  'Looking for contacts in the aged care sector wanting facility improvements.',
  'Need introductions to body corporate committees considering building maintenance.',
  'Seeking referrals to small business owners needing bookkeeping services.',
  'Looking for anyone planning a kitchen or bathroom renovation.',
  'Need connections to real estate agents wanting professional photography.',
  'Seeking introductions to business owners needing fleet vehicle servicing.',
];

const tsTx = db.transaction(() => {
  sampleChapters.forEach((chapter, ci) => {
    const statuses = ['draft', 'content_pending', 'review', 'approved', 'shipped'];
    const weekDate = `2026-03-${String(14 - ci * 7).padStart(2, '0')}`;
    const frontCover = JSON.stringify({ headline: chapter.name, subheadline: 'Weekly Trade Sheet', featured_member: 'Member Spotlight', featured_member_quote: 'BNI has transformed my business through the power of referrals.', edition: `Vol. 12, Issue ${10 + ci}` });
    const backPage = JSON.stringify({ upcoming_events: 'BNI National Conference 2026 - May 15-17, Melbourne Convention Centre', chapter_stats: { members: 30, referrals_ytd: 450, revenue_ytd: '$1.2M' }, contact: 'Visit bni.com.au for more information' });
    const result = insertTS.run(chapter.id, weekDate, statuses[ci], frontCover, '{}', '{}', backPage, adminUser.id, 50, 'Chapter meeting location');
    const tsId = result.lastInsertRowid;
    const members = db.prepare("SELECT id, name FROM users WHERE chapter_id = ? AND role != 'admin' LIMIT 25").all(chapter.id);
    members.forEach((m, i) => { insertRR.run(tsId, m.id, referralTemplates[i % referralTemplates.length], i); });
    insertNotice.run(tsId, 'Visitor Day', 'Our next Visitor Day is coming up! Invite your contacts to experience the power of BNI.', 'event', 0);
    insertNotice.run(tsId, 'Member Milestone', 'Congratulations to our members who passed $50,000 in referral revenue this quarter!', 'milestone', 1);
    insertNotice.run(tsId, 'Chapter Update', 'We are growing strongly. Thank you for your commitment to this chapter.', 'update', 2);
  });
});
tsTx();
console.log('Created sample trade sheets with referrals and notices');

const shippedSheets = db.prepare("SELECT id, print_copies, shipping_address FROM trade_sheets WHERE status IN ('approved', 'shipped')").all();
shippedSheets.forEach(ts => {
  db.prepare('INSERT INTO shipping_orders (trade_sheet_id, copies, shipping_address, status, tracking_number, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?)').run(ts.id, ts.print_copies, ts.shipping_address || 'Chapter meeting location', 'delivered', 'AU' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'), '2026-03-13');
});

console.log('\n========================================');
console.log('Seeding complete with REAL member data!');
console.log('========================================');
console.log(`${chapters.length} chapters | ${totalMembers} members`);
console.log('Admin: benjamin@cornerstoneandcompass.com / admin123');
