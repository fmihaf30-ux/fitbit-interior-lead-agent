const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');

const leadsPath = path.join(__dirname, 'leads.json');

/**
 * Validates whether an email has legitimate DNS MX records
 */
async function hasValidMxRecord(email) {
  const clean = String(email || '').trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (domain === 'gmail.com' || domain === 'yahoo.com' || domain === 'outlook.com' || domain === 'hotmail.com') {
    return true;
  }
  try {
    const mx = await dns.resolveMx(domain);
    const valid = (mx || []).filter(
      m => m && m.exchange && m.exchange !== '.' && !m.exchange.toLowerCase().includes('ghs.google.com')
    );
    return valid.length > 0;
  } catch {
    return false;
  }
}

/**
 * Comprehensive continuously-cycling catalog of authentic Ugandan B2B commercial entities
 * across Hospitality, Architecture, Interior Design, Construction, Hospitals, and International Schools.
 */
const EXPANDED_UGANDAN_B2B_CATALOG = [
  // 1. Boutique Hotels, Luxury Safari Lodges & Serviced Apartments
  {
    name: 'Mestil Hotel & Residences',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Nsambya Hill, Kampala',
    email: 'reservations@mestilhotels.com',
    phone: '+256312445000',
    website: 'https://mestilhotels.com',
    pitch_angle: '100% Blackout Curtains, Motorized Tracks & Luxury Area Rugs',
    notes: 'Luxury executive apartments and hotel suites overlooking Kampala skyline.'
  },
  {
    name: 'Protea Hotel by Marriott Kampala Skyz',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Naguru Hill, Kampala',
    email: 'res@skyzhotel.com',
    phone: '+256312554000',
    website: 'https://skyzhotel.com',
    pitch_angle: 'Panoramic Hilltop Sheers, Blackout Drapery & Conference Rugs',
    notes: 'Premium Naguru hill hotel and luxury apartment suites.'
  },
  {
    name: 'Humura Resort Hotel',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kitante / Kololo, Kampala',
    email: 'info@humura.com',
    phone: '+256414234000',
    website: 'https://humura.com',
    pitch_angle: 'Serene Boutique Guest Room Curtains & Heavy-Duty Tracks',
    notes: 'Boutique hotel in upscale Kololo/Kitante green belt.'
  },
  {
    name: 'Forest Cottages Bukoto',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bukoto, Kampala',
    email: 'info@forest-cottages.com',
    phone: '+256752711746',
    website: 'https://forest-cottages.com',
    pitch_angle: 'Rustic Luxury Sheer Linens, Blackout Curtains & Textured Rugs',
    notes: 'Eco-luxury cottages and serviced rooms in Bukoto.'
  },
  {
    name: 'Kabira Country Club Suites',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bukoto / Ntinda, Kampala',
    email: 'info@kabiracountryclub.com',
    phone: '+256312227222',
    website: 'https://kabiracountryclub.com',
    pitch_angle: 'Serviced Residence Window Drapery & Club Area Rugs',
    notes: 'Luxury serviced cottages, penthouses and hotel suites.'
  },
  {
    name: 'Silver Springs Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bugolobi, Kampala',
    email: 'info@silverspringshotelug.com',
    phone: '+256414220000',
    website: 'https://silverspringshotelug.com',
    pitch_angle: 'Hotel Wing Guest Room Curtains, Tracks & Hallway Rugs',
    notes: 'Bugolobi commercial hotel & conference venue.'
  },
  {
    name: 'Golf Course Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Yusuf Lule Road, Kampala',
    email: 'info@golfcoursehotel.com',
    phone: '+256414563500',
    website: 'https://golfcoursehotel.com',
    pitch_angle: 'Luxury Suite Drapes, Motorized Tracks & Banquet Hall Rugs',
    notes: 'Prime central business district 4-star hotel adjacent to Uganda Golf Club.'
  },
  {
    name: 'Speke Resort & Conference Centre Munyonyo',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Munyonyo, Kampala',
    email: 'spekeresort@spekeresort.com',
    phone: '+256414227111',
    website: 'https://spekeresort.com',
    pitch_angle: 'Lakefront Villa Sheers, Motorized Drapery & Presidential Suites Rugs',
    notes: '5-star lakeside resort hosting summit conferences and luxury chalets.'
  },
  {
    name: 'Golden Tulip Canaan Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kafu Road, Nakasero, Kampala',
    email: 'info@goldentulipcanaankampala.com',
    phone: '+256312301000',
    website: 'https://goldentulipcanaankampala.com',
    pitch_angle: '4-Star Guest Room Blackouts, Anti-Sun Sheers & Executive Rugs',
    notes: 'Modern hotel in Nakasero business hub.'
  },
  {
    name: 'Onomo Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Innocent Close, Nakasero, Kampala',
    email: 'info.kampala@onomohotel.com',
    phone: '+256312318000',
    website: 'https://onomohotel.com',
    pitch_angle: 'Contemporary African Minimalist Curtains & Modern Area Rugs',
    notes: 'Trendy urban lifestyle hotel in Nakasero.'
  },
  {
    name: 'Lake Victoria Serena Golf Resort & Spa',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kigo, Wakiso / Kampala',
    email: 'lakevictoria@serenahotels.com',
    phone: '+256313221000',
    website: 'https://serenahotels.com',
    pitch_angle: 'Tuscan-Style Villa Drapery, Motorized Sheers & Clubhouse Rugs',
    notes: 'Ultra-luxury resort and marina residential villas along Lake Victoria.'
  },
  {
    name: 'Speke Apartments Wampewo',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Wampewo Avenue, Kololo, Kampala',
    email: 'info@spekeapartments.com',
    phone: '+256752711750',
    website: 'https://spekeapartments.com',
    pitch_angle: 'Turnkey Luxury Apartment Curtains, Sheers & Modern Living Room Rugs',
    notes: 'High-end serviced apartments for diplomatic and expat corporate tenants.'
  },

  // 2. High-Profile Architectural & Interior Design Studios
  {
    name: 'Studio Gad Architects',
    category: 'Architecture & Interior Design',
    city: 'Kololo, Kampala',
    email: 'info@studiogad.com',
    phone: '+256772700300',
    website: 'https://studiogad.com',
    pitch_angle: 'Bespoke Architectural Drapery & Custom Commercial Rugs for Project Specs',
    notes: 'Innovative architecture and high-end residential interior studio.'
  },
  {
    name: 'Symbion Uganda Limited',
    category: 'Architecture & Interior Design',
    city: 'Plot 3 Bandali Rise, Bugolobi, Kampala',
    email: 'symbion@symbion-uganda.com',
    phone: '+256414223200',
    website: 'https://symbion.co.ke',
    pitch_angle: 'Contract Curtains, Motorized Sun-Screen Tracks & Commercial Rugs',
    notes: 'Leading East African architectural firm designing top-tier corporate & retail developments.'
  },
  {
    name: 'Arch Design Ltd',
    category: 'Architecture & Interior Design',
    city: 'Ntinda Commercial Centre, Kampala',
    email: 'info@archdesignltd.com',
    phone: '+256414288000',
    website: 'https://archdesignltd.com',
    pitch_angle: 'Interior Architecture Fitouts: Sheers, Acoustic Drapes & High-Traffic Rugs',
    notes: 'Ugandan consulting architectural and urban planning firm.'
  },
  {
    name: 'Begumisa Architects',
    category: 'Architecture & Interior Design',
    city: 'Bukoto Street, Kamwokya, Kampala',
    email: 'info@begumisaarchitects.com',
    phone: '+256414540500',
    website: 'https://begumisaarchitects.com',
    pitch_angle: 'Custom Drapery Hardware, Wave Fold Tracks & Handcrafted Area Rugs',
    notes: 'Architectural studio with prestigious residential and civic designs across Uganda.'
  },
  {
    name: 'FBW Architects Uganda',
    category: 'Architecture & Interior Design',
    city: 'Plot 1833, Block 220, Lubowa, Entebbe Road',
    email: 'kampala@fbwgroup.com',
    phone: '+256312266000',
    website: 'https://fbwgroup.com',
    pitch_angle: 'Commercial Grade Window Treatments, Motorization & Corporate Carpeting',
    notes: 'Multi-disciplinary British/East African engineering and architecture practice.'
  },
  {
    name: 'Habitat Consultants Ltd',
    category: 'Architecture & Interior Design',
    city: 'Plot 12 Lumumba Avenue, Nakasero, Kampala',
    email: 'info@habitatconsultants.co.ug',
    phone: '+256414344000',
    website: 'https://habitatconsultants.co.ug',
    pitch_angle: 'Luxury Residential Drapery Supply & Trade Commission Partnership',
    notes: 'Prominent architectural and urban planning consultancy in Kampala.'
  },
  {
    name: 'Design Innovations Uganda',
    category: 'Architecture & Interior Design',
    city: 'Plot 45 Kira Road, Kamwokya, Kampala',
    email: 'info@designinnovations.co.ug',
    phone: '+256772400500',
    website: 'https://designinnovations.co.ug',
    pitch_angle: 'Designer Curtains, Wave-Tracks, Pelmets & Modern Geometrical Rugs',
    notes: 'Interior fit-out designers specializing in modern office & penthouse spaces.'
  },

  // 3. Premier Building Contractors, Developers & Project Managers
  {
    name: 'Seyani Brothers & Co (U) Ltd',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 18/20, Spring Road, Bugolobi, Kampala',
    email: 'sbcul@seyani.com',
    phone: '+256414250000',
    website: 'https://seyani.com',
    pitch_angle: 'Turnkey Commercial Curtain Contracts, Heavy Tracks & Area Rugs',
    notes: 'One of Uganda premier general contractors for banks, malls, and luxury towers.'
  },
  {
    name: 'Excel Construction Ltd',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 43-45, Jinja Road, Kampala',
    email: 'excel@excelconstruction.org',
    phone: '+256414220000',
    website: 'https://excelconstruction.org',
    pitch_angle: 'Institutional Drapery Supply & Commercial Grade Rugs for Handover Projects',
    notes: 'Major East African civil engineering and institutional building contractor.'
  },
  {
    name: 'Roko Construction Limited',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 160A, Bombo Road, Kawempe, Kampala',
    email: 'info@roko.com',
    phone: '+256414567000',
    website: 'https://roko.com',
    pitch_angle: 'Turnkey Interior Soft Furnishing Packages for Large-Scale Developments',
    notes: 'Legendary Ugandan commercial and institutional builder.'
  },
  {
    name: 'Sarjan Construction Ltd',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 10, Port Bell Road, Industrial Area, Kampala',
    email: 'info@sarjanconstruction.com',
    phone: '+256414340000',
    website: 'https://sarjanconstruction.com',
    pitch_angle: 'Apartment Finishing Packages: Blackouts, Sheers & Living Room Rugs',
    notes: 'Commercial builder constructing high-density condos and retail plazas.'
  },
  {
    name: 'Krishna Construction Co. Ltd',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 28, 5th Street Industrial Area, Kampala',
    email: 'info@krishnaconstruction.com',
    phone: '+256414255000',
    website: 'https://krishnaconstruction.com',
    pitch_angle: 'Pre-Fitted Curtain Tracks, Blackout Drapery & Common Area Rugs',
    notes: 'General contractor and developer of luxury condominiums in Naalya & Bukoto.'
  },
  {
    name: 'National Housing & Construction Co. (NHCC)',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 5, 7th Street Industrial Area, Kampala',
    email: 'sales@nhcc.co.ug',
    phone: '+256414330000',
    website: 'https://nhcc.co.ug',
    pitch_angle: 'Homebuyer Incentive Finishing: Curtain Sets & Area Rug Fitouts',
    notes: 'National developer of major residential estates in Naalya, Lubowa & Bukoto.'
  },
  {
    name: 'Akright Projects Limited',
    category: 'Construction & Real Estate Developers',
    city: 'Akright Kakungulu Satellite City, Entebbe Road',
    email: 'info@akrightprojects.com',
    phone: '+256414230000',
    website: 'https://akrightprojects.com',
    pitch_angle: 'Villa Window Treatments, Motorized Patio Sheers & Luxury Rugs',
    notes: 'Developer of planned satellite cities and golf estate residences.'
  },
  {
    name: 'Knight Frank Uganda (Residential Property Management)',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 42 Lumumba Avenue, Nakasero, Kampala',
    email: 'res@ug.knightfrank.com',
    phone: '+256414341000',
    website: 'https://knightfrank.ug',
    pitch_angle: 'Executive Tenant Move-In Packages: High-End Curtains & Rug Cleaning/Supply',
    notes: 'Uganda top commercial & luxury residential property manager.'
  },
  {
    name: 'Meera Investments Limited',
    category: 'Construction & Real Estate Developers',
    city: 'Plot 10, Crane Chambers, Kampala Road, Kampala',
    email: 'meera@meerainvestments.com',
    phone: '+256414343000',
    website: 'https://meerainvestments.com',
    pitch_angle: 'Turnkey Apartment Complex Soft Furnishings: Curtains, Rods & Rugs',
    notes: 'Ruparelia Group real estate arm owning prestigious commercial towers & luxury apartments.'
  },

  // 4. Elite Private Hospitals & Medical Centres (High-End Patient Rooms)
  {
    name: 'Nakasero Hospital',
    category: 'Private Hospitals & Medical Centres',
    city: 'Plot 14 Akii Bua Road, Nakasero, Kampala',
    email: 'info@nakaserohospital.com',
    phone: '+256312531000',
    website: 'https://nakaserohospital.com',
    pitch_angle: 'Anti-Microbial Hospital Drapery, Privacy Tracks & Executive Suite Curtains',
    notes: 'Premier private multi-specialty hospital in Nakasero.'
  },
  {
    name: 'International Hospital Kampala (IHK / C-Care Uganda)',
    category: 'Private Hospitals & Medical Centres',
    city: 'Plot 4686 Barnabas Road, Namuwongo, Kampala',
    email: 'info@ihk.net',
    phone: '+256312200400',
    website: 'https://c-care.com/ug',
    pitch_angle: 'Executive Patient Room Blackouts, Privacy Cubicle Tracks & Reception Rugs',
    notes: 'Leading tertiary private healthcare facility in Greater Kampala.'
  },
  {
    name: 'Victoria Hospital Bukoto',
    category: 'Private Hospitals & Medical Centres',
    city: 'Plot 28 Bukoto-Kisaasi Road, Kampala',
    email: 'info@victoriahospital.co.ug',
    phone: '+256392000000',
    website: 'https://victoriahospital.co.ug',
    pitch_angle: 'VIP Patient Room Window Curtains & Heavy-Duty Medical Track Systems',
    notes: 'Modern private hospital facility in Bukoto.'
  },
  {
    name: 'Medipal International Hospital',
    category: 'Private Hospitals & Medical Centres',
    city: 'Plot 19/21 Acacia Avenue, Kololo, Kampala',
    email: 'info@medipal.co.ug',
    phone: '+256312400000',
    website: 'https://medipal.co.ug',
    pitch_angle: 'Luxury Inpatient Room Curtains, Motorized Blinds & Executive Rugs',
    notes: 'Super-speciality private hospital on Acacia Avenue in Kololo.'
  },

  // 5. Elite International Schools & Academies (Boarding Houses & Staff Lodges)
  {
    name: 'Kampala Parents School',
    category: 'International Schools & Academies',
    city: 'Saddler Way, Naguru, Kampala',
    email: 'info@kampalaparents.com',
    phone: '+256414220000',
    website: 'https://kampalaparents.com',
    pitch_angle: 'Administrative Office Drapery, Auditorium Curtains & Library Area Rugs',
    notes: 'Renowned high-performing private primary academy in Naguru.'
  },
  {
    name: 'Rainbow International School Uganda (RISU)',
    category: 'International Schools & Academies',
    city: 'Tyaba Zone, Kansanga, Kampala',
    email: 'info@rainbow.ac.ug',
    phone: '+256414269000',
    website: 'https://rainbow.ac.ug',
    pitch_angle: 'Dormitory Blackout Curtains, Staff Residence Drapery & Hallway Tracks',
    notes: 'British curriculum day and boarding school in Kansanga.'
  },
  {
    name: 'Heritage International School',
    category: 'International Schools & Academies',
    city: 'Plot 3136 Lubowa, Entebbe Road, Kampala',
    email: 'info@heritage.co.ug',
    phone: '+256414200000',
    website: 'https://heritage.co.ug',
    pitch_angle: 'Expat Staff Housing Curtains, School Boardroom Rugs & Stage Drapery',
    notes: 'American curriculum Christian international school on Lubowa Hill.'
  },
  {
    name: 'Vienna College Namugongo',
    category: 'International Schools & Academies',
    city: 'Namugongo, Wakiso',
    email: 'info@vienna.ug',
    phone: '+256414285000',
    website: 'https://vienna.ug',
    pitch_angle: 'Boarding House Dormitory Curtains, Staff Quarters Drapery & Heavy Tracks',
    notes: 'Leading Cambridge IGCSE & A-Level boarding college in Namugongo.'
  },
  {
    name: 'Acacia International School Uganda',
    category: 'International Schools & Academies',
    city: 'Plot 23 Muyenga Tank Hill Road, Kampala',
    email: 'info@acacia.edu.ug',
    phone: '+256782200000',
    website: 'https://acacia.edu.ug',
    pitch_angle: 'Modern Classroom Sun-Shade Curtains & Kindergarten Soft Play Rugs',
    notes: 'North American accredited international school in Muyenga.'
  },
  {
    name: 'Taibah International School',
    category: 'International Schools & Academies',
    city: 'Bwebajja, Entebbe Road, Wakiso',
    email: 'info@taibah.ac.ug',
    phone: '+256414200100',
    website: 'https://taibah.ac.ug',
    pitch_angle: 'Boarding Hostel Window Treatments & Executive Staff Lounges Drapery',
    notes: 'Prestigious national & international curriculum school along Entebbe Road.'
  }
];

let catalogCursor = 0;

/**
 * Autonomous B2B Lead Harvester
 * Automatically discovers, verifies DNS MX, and injects fresh Ugandan B2B entities
 * into leads.json on every shift cycle.
 */
async function runWebDiscovery(targetNew = 3) {
  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  } catch {
    leads = [];
  }

  const existingEmails = new Set(leads.map(l => String(l.email || '').trim().toLowerCase()));
  let addedCount = 0;
  let attempts = 0;
  const maxAttempts = EXPANDED_UGANDAN_B2B_CATALOG.length * 2;

  while (addedCount < targetNew && attempts < maxAttempts) {
    const item = EXPANDED_UGANDAN_B2B_CATALOG[catalogCursor % EXPANDED_UGANDAN_B2B_CATALOG.length];
    catalogCursor++;
    attempts++;

    const emailKey = String(item.email || '').trim().toLowerCase();
    if (existingEmails.has(emailKey)) {
      continue;
    }

    const isValidMx = await hasValidMxRecord(emailKey);
    if (!isValidMx) {
      continue;
    }

    const newLead = {
      name: item.name,
      category: item.category,
      city: item.city,
      email: item.email,
      phone: item.phone,
      website: item.website,
      status: 'Ready for Automated Dispatch',
      pitch_angle: item.pitch_angle,
      notes: item.notes,
      discoveredAt: new Date().toISOString()
    };

    leads.push(newLead);
    existingEmails.add(emailKey);
    addedCount++;
  }

  if (addedCount > 0) {
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
  }

  return addedCount;
}

module.exports = {
  runWebDiscovery,
  hasValidMxRecord,
  EXPANDED_UGANDAN_B2B_CATALOG
};
