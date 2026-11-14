const fs = require('fs');
const path = require('path');
const { syncToSheets, formatPhoneForSheet } = require('./sync');
const { reconcileSentLeadsWithGmail } = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');

const NEW_WIDER_LEADS = [
  // Resorts, Hotels & Lodges (Munyonyo, Mbarara, Fort Portal)
  { name: 'Speke Resort & Conference Centre Munyonyo', category: 'Serviced Apartments & Boutique Hotels', city: 'Munyonyo, Kampala', email: 'info@spekeresort.com', phone: '+256414227111', website: 'https://spekeresort.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Resort Suite Drapery, Heavy Curtain Tracks & Conference Rugs', notes: 'Major lakeside resort and apartments in Munyonyo.' },
  { name: 'Cassia Lodge Buziga', category: 'Serviced Apartments & Boutique Hotels', city: 'Buziga Hill, Kampala', email: 'info@cassialodge.com', phone: '+256752711000', website: 'https://cassialodge.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Panoramic Lakeview Sheers & Blackout Curtains', notes: 'Panoramic balcony rooms on Buziga Hill.' },
  { name: 'Destiny Hotel Munyonyo', category: 'Serviced Apartments & Boutique Hotels', city: 'Munyonyo, Kampala', email: 'info@destinyhotel.co.ug', phone: '+256702888111', website: 'https://destinyhotel.co.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'Guest Room Blackout Curtains, Rods & Rugs', notes: 'Boutique hotel in Munyonyo.' },
  { name: 'Lake View Resort Hotel Mbarara', category: 'Serviced Apartments & Boutique Hotels', city: 'Mbarara City', email: 'info@lakeviewresorthotel.com', phone: '+256485420992', website: 'https://lakeviewresorthotel.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Countrywide Hotel Curtain, Track & Rug Supply', notes: 'Premier resort hotel in Mbarara.' },
  { name: 'Hotel Triangle Mbarara', category: 'Serviced Apartments & Boutique Hotels', city: 'Mbarara City', email: 'reservations@hoteltrianglembarara.com', phone: '+256772456789', website: 'https://hoteltrianglembarara.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Guest Room Drapery & Rug Refresh', notes: 'Business and leisure hotel in Mbarara.' },
  { name: 'Acacia Boutique Hotel Mbarara', category: 'Serviced Apartments & Boutique Hotels', city: 'Mbarara City', email: 'sales@acaciahotels.com', phone: '+256703112299', website: 'https://acaciahotels.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Boutique Hotel Curtains, Sheers & Bedroom Rugs', notes: 'Boutique hospitality group in Western Uganda.' },
  { name: 'Nyaika Hotel Fort Portal', category: 'Serviced Apartments & Boutique Hotels', city: 'Fort Portal Tourism City', email: 'info@nyaikahotel.com', phone: '+256393240900', website: 'https://nyaikahotel.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Luxury Hotel Blackout Drapery & Heavy Tracks', notes: 'Major luxury hotel in Fort Portal.' },
  { name: 'Fort Motel Fort Portal', category: 'Serviced Apartments & Boutique Hotels', city: 'Fort Portal Tourism City', email: 'reservations@fortmotel.com', phone: '+256772200100', website: 'https://fortmotel.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Boutique Guest Room Curtains, Rods & Rugs', notes: 'Upscale boutique hotel in Fort Portal.' },
  { name: 'Jade Hotel Fort Portal', category: 'Serviced Apartments & Boutique Hotels', city: 'Fort Portal Tourism City', email: 'info@jadehotelug.com', phone: '+256704556611', website: 'https://jadehotelug.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Hotel Room Curtains, Sheers & Floor Rugs', notes: 'Modern hotel in Fort Portal.' },

  // Construction Contractors, Developers & Agencies
  { name: 'ROKO Construction Limited', category: 'Real Estate Developers & Property Managers', city: 'Kawempe, Kampala', email: 'roko@roko.com', phone: '+256312260100', website: 'https://roko.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Window Treatment & Curtain Track Subcontractor for Projects', notes: 'Leading construction & commercial building contractor in Uganda.' },
  { name: 'Coronation Developers (U) Ltd', category: 'Real Estate Developers & Property Managers', city: 'Ntinda, Kampala', email: 'info@coronationdevelopers.co.ug', phone: '+256392175000', website: 'https://coronationdevelopers.co.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'Apartment & Commercial Development Curtain Packages', notes: 'Major real estate developer and construction firm in Ntinda.' },
  { name: 'SMS Construction Ltd', category: 'Real Estate Developers & Property Managers', city: 'Industrial Area, Kampala', email: 'info@smsconstruction.com', phone: '+256414344000', website: 'https://smsconstruction.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Commercial & Residential Fit-Out Curtain Subcontractor', notes: 'High-end commercial and residential construction company.' },
  { name: 'Villa Real Estates Property (U) Ltd', category: 'Real Estate Developers & Property Managers', city: 'Kampala', email: 'info@villarealestateuganda.com', phone: '+256701334455', website: 'https://villarealestateuganda.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Managed Property & Rental Curtain Packages', notes: 'Property management and real estate agency in Kampala.' },
  { name: 'Saamia Property Agency', category: 'Real Estate Developers & Property Managers', city: 'Kampala', email: 'info@saamiapropertyagency.com', phone: '+256772889911', website: 'https://saamiapropertyagency.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Turnkey Curtains, Rods & Rugs for Managed Properties', notes: 'Real estate management and development agency.' },
  { name: 'Peatfield & Bodgener Architects', category: 'Interior Designers & Decorators', city: 'Kampala', email: 'info@pbarch.org', phone: '+256414259000', website: 'https://pbarch.org', status: 'Ready for Automated Dispatch', pitch_angle: 'Architectural Curtain Track & Drapery Specification Partner', notes: 'Established architectural practice in Kampala.' },

  // Private Hospitals & Medical Centers
  { name: 'Kampala Hospital (Kololo)', category: 'Corporate Offices & Commercial Spaces', city: 'Kololo, Kampala', email: 'info@kampalahospital.com', phone: '+256312563400', website: 'https://kampalahospital.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Private Ward Blackout Curtains, Cubicle Tracks & Privacy Screens', notes: 'Executive private hospital in Kololo.' },
  { name: 'Nakasero Hospital', category: 'Corporate Offices & Commercial Spaces', city: 'Nakasero, Kampala', email: 'info@nhl.co.ug', phone: '+256312531400', website: 'https://nhl.co.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'VIP Ward Curtains, Ceiling Cubicle Tracks & Sheers', notes: 'Major private hospital in Nakasero.' },
  { name: 'Ntinda Hospital', category: 'Corporate Offices & Commercial Spaces', city: 'Ntinda, Kampala', email: 'info@ntindahospital.co.ug', phone: '+256414289000', website: 'https://ntindahospital.co.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'Hospital Ward Curtains, Privacy Tracks & Window Blinds', notes: 'Private hospital in Ntinda.' },

  // International Schools & Campuses
  { name: 'Heritage International School', category: 'Corporate Offices & Commercial Spaces', city: 'Kansanga, Kampala', email: 'his@heritage.co.ug', phone: '+256393266643', website: 'https://heritage.co.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'Classroom Glare-Control Curtains, Hall Drapery & Office Rugs', notes: 'International school campus in Kansanga.' },
  { name: 'Kabojja International School', category: 'Corporate Offices & Commercial Spaces', city: 'Buwate, Kampala', email: 'info@kabojjainternational.com', phone: '+256312262450', website: 'https://kabojjainternational.com', status: 'Ready for Automated Dispatch', pitch_angle: 'School Campus, Dormitory & Hall Curtains and Tracks', notes: 'Major international school in Buwate.' },
  { name: 'Greenhill International School', category: 'Corporate Offices & Commercial Spaces', city: 'Kansanga / Buwaate, Kampala', email: 'info@gis.ac.ug', phone: '+256414510275', website: 'https://gis.ac.ug', status: 'Ready for Automated Dispatch', pitch_angle: 'Auditorium Stage Drapery, Classroom Curtains & Heavy Tracks', notes: 'Large school campus in Kampala.' },
  { name: 'Ambrosoli International School', category: 'Corporate Offices & Commercial Spaces', city: 'Bugolobi, Kampala', email: 'admissions@ambrosolischool.com', phone: '+256312263164', website: 'https://ambrosolischool.com', status: 'Ready for Automated Dispatch', pitch_angle: 'Campus Window Curtains, Sheers & Rugs', notes: 'International school in Bugolobi.' }
];

async function expandAndSync() {
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const existingEmails = new Set(leads.map(l => (l.email || '').toLowerCase()));

  let added = 0;
  for (const item of NEW_WIDER_LEADS) {
    if (!existingEmails.has(item.email.toLowerCase())) {
      item.phone = formatPhoneForSheet(item.phone);
      leads.push(item);
      existingEmails.add(item.email.toLowerCase());
      added++;
    }
  }

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
  console.log(`[+] Added ${added} new multi-sector leads across Uganda. Total leads: ${leads.length}`);

  await reconcileSentLeadsWithGmail();
  syncToSheets();
}

expandAndSync();
