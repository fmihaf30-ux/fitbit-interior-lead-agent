require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true, quiet: true });
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const BUSINESS_NAME = 'Fitbit Interiors';
const BUSINESS_PHONE = process.env.BUSINESS_WHATSAPP || '+256751567860';
const BUSINESS_EMAIL = process.env.SMTP_EMAIL || 'sseguyafahim1@gmail.com';
const BUSINESS_INSTAGRAM = 'https://www.instagram.com/fitbit_interiors';

/**
 * Standard Ugandan Trade Pricing for Fitbit Interiors (UGX)
 */
const PRICING_RATES = {
  // Fabric per meter (Standard 2.8m - 3.0m drop height fabric)
  FABRICS: {
    blackout_premium: { name: 'Premium 100% Thermal Blackout (Dimout)', rate: 55000 },
    blackout_standard: { name: 'Standard Textured Blackout Fabric', rate: 45000 },
    sheer_linen: { name: 'Luxury Linen-Look Sheer (Voile)', rate: 32000 },
    sheer_plain: { name: 'Classic Translucent Sheer Voile', rate: 25000 },
    velvet_heavy: { name: 'Heavy Royal Velvet Drapery', rate: 65000 }
  },
  // Tracks & Rods per meter
  HARDWARE: {
    double_track_heavy: { name: 'Heavy-Duty Double Aluminum Ceiling/Wall Track', rate: 40000 },
    single_track_heavy: { name: 'Heavy-Duty Single Aluminum Track', rate: 25000 },
    double_metal_rod: { name: 'Decorative Double Metal Rod (Matt Black/Brass)', rate: 60000 },
    single_metal_rod: { name: 'Decorative Single Metal Rod', rate: 38000 }
  },
  // Workmanship & Accessories
  WORKMANSHIP: {
    tailoring_pleated: { name: 'Custom Pleat Tailoring & Heading Tape (per meter)', rate: 10000 },
    tailoring_eyelet: { name: 'Custom Eyelet Punching & Metal Rings (per meter)', rate: 14000 },
    installation_window: { name: 'On-Site Drilling, Mounting & Dressing (per window)', rate: 25000 }
  },
  // Modern Rugs (Fixed unit prices)
  RUGS: {
    rug_medium: { name: 'Modern Geometric Living Room Rug (5ft x 7ft)', rate: 380000 },
    rug_large: { name: 'Luxury High-Pile Nordic Rug (6ft x 9ft)', rate: 550000 },
    rug_xl: { name: 'Grand Executive Wool-Blend Rug (8ft x 10ft)', rate: 850000 }
  }
};

/**
 * Calculates fabric meterage and hardware required for a window:
 * - Fullness multiplier: 2.5x width for deep hotel-grade ripple/pleat folds.
 * - Width in meters, height in meters.
 */
function calculateWindowRequirements({
  widthMeters,
  heightMeters,
  includeSheer = true,
  fabricType = 'blackout_premium',
  sheerType = 'sheer_linen',
  hardwareType = 'double_track_heavy'
}) {
  const fullnessFactor = 2.5;
  const fabricMetersNeeded = Math.ceil(widthMeters * fullnessFactor * 10) / 10;
  const trackMetersNeeded = Math.ceil(widthMeters * 10) / 10;

  const mainFabric = PRICING_RATES.FABRICS[fabricType] || PRICING_RATES.FABRICS.blackout_premium;
  const sheerFabric = PRICING_RATES.FABRICS[sheerType] || PRICING_RATES.FABRICS.sheer_linen;
  const hardware = PRICING_RATES.HARDWARE[hardwareType] || PRICING_RATES.HARDWARE.double_track_heavy;

  const items = [];

  // 1. Main Fabric
  items.push({
    category: 'Fabric',
    name: mainFabric.name,
    qty: fabricMetersNeeded,
    unit: 'meters',
    rate: mainFabric.rate,
    amount: fabricMetersNeeded * mainFabric.rate
  });

  // 2. Sheer Fabric (if selected)
  if (includeSheer) {
    items.push({
      category: 'Sheer',
      name: sheerFabric.name,
      qty: fabricMetersNeeded,
      unit: 'meters',
      rate: sheerFabric.rate,
      amount: fabricMetersNeeded * sheerFabric.rate
    });
  }

  // 3. Hardware / Track
  items.push({
    category: 'Hardware',
    name: hardware.name,
    qty: trackMetersNeeded,
    unit: 'meters',
    rate: hardware.rate,
    amount: trackMetersNeeded * hardware.rate
  });

  // 4. Tailoring & Stitching
  const totalMeters = fabricMetersNeeded * (includeSheer ? 2 : 1);
  const tailoringRate = PRICING_RATES.WORKMANSHIP.tailoring_pleated.rate;
  items.push({
    category: 'Workmanship',
    name: 'Precision Pleating, Ironing & Heading Tape',
    qty: totalMeters,
    unit: 'meters',
    rate: tailoringRate,
    amount: totalMeters * tailoringRate
  });

  // 5. Professional Installation
  items.push({
    category: 'Installation',
    name: 'Professional Fitting, Bracket Anchoring & Steaming',
    qty: 1,
    unit: 'window',
    rate: PRICING_RATES.WORKMANSHIP.installation_window.rate,
    amount: PRICING_RATES.WORKMANSHIP.installation_window.rate
  });

  return items;
}

/**
 * Formats numbers into clean UGX currency strings (e.g. 1,450,000 UGX)
 */
function formatUgx(amount) {
  return Number(amount).toLocaleString('en-US') + ' UGX';
}

/**
 * Generates an executive, print-ready PDF Quotation
 */
async function generateQuotationPdf({
  clientName = 'Valued Client',
  clientPhone = '',
  clientLocation = 'Kampala, Uganda',
  quoteNumber = null,
  windows = [],
  addRugs = []
}) {
  const qNum = quoteNumber || `FI-QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const safeClientSlug = clientName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const outputFileName = `Fitbit_Interiors_Quote_${safeClientSlug}_${qNum}.pdf`;
  const outputPath = path.join(__dirname, outputFileName);

  // Compile all line items
  let lineItems = [];
  windows.forEach((win, idx) => {
    const winItems = calculateWindowRequirements(win);
    winItems.forEach(it => {
      it.label = `${win.roomName || `Window #${idx + 1}`} (${win.widthMeters}m x ${win.heightMeters}m) — ${it.name}`;
      lineItems.push(it);
    });
  });

  // Add optional rugs
  addRugs.forEach(rKey => {
    const rug = PRICING_RATES.RUGS[rKey];
    if (rug) {
      lineItems.push({
        category: 'Rugs',
        label: `Living Area Accent Rug — ${rug.name}`,
        qty: 1,
        unit: 'pc',
        rate: rug.rate,
        amount: rug.rate
      });
    }
  });

  const subtotal = lineItems.reduce((acc, it) => acc + it.amount, 0);
  const grandTotal = subtotal;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Fitbit Interiors Quotation - ${clientName}`,
          Author: 'Fitbit Interiors Kampala',
          Subject: 'Official Custom Curtains & Rugs Quotation'
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // --- HEADER BAR (Navy & Amber Gold) ---
      doc.rect(0, 0, 595.28, 92).fill('#0F172A');
      doc.rect(0, 92, 595.28, 4).fill('#D97706');

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('FITBIT INTERIORS', 40, 24, { characterSpacing: 1.5 });

      doc
        .fillColor('#FCD34D')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('CUSTOM CURTAINS  •  SHEER FABRICS  •  HEAVY-DUTY RODS  •  MODERN RUGS', 40, 52);

      doc
        .fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(8.5)
        .text('Plot 14 / Kampala Road & Countrywide On-Site Installations', 40, 68);

      // Header Right Box: Quote Details
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('OFFICIAL ESTIMATE', 370, 24, { align: 'right', width: 185 });

      doc
        .fillColor('#FCD34D')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`Quote Ref: ${qNum}`, 370, 48, { align: 'right', width: 185 });

      doc
        .fillColor('#E2E8F0')
        .font('Helvetica')
        .fontSize(8.5)
        .text(`Date: ${dateStr}  |  Valid: 14 Days`, 370, 64, { align: 'right', width: 185 });

      // --- CLIENT INFO & CONTACT METADATA (Box) ---
      const clientBoxY = 112;
      doc.rect(40, clientBoxY, 515.28, 62).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('PREPARED FOR:', 55, clientBoxY + 12);

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#1E293B')
        .text(clientName, 55, clientBoxY + 26);

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#64748B')
        .text(`Site / Location: ${clientLocation}${clientPhone ? `  |  Phone: ${clientPhone}` : ''}`, 55, clientBoxY + 42);

      // Direct WhatsApp Contact badge on right
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#D97706')
        .text('Direct Support & Measurement Desk', 340, clientBoxY + 14, { align: 'right', width: 200 });

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#0F172A')
        .text(`WhatsApp: ${BUSINESS_PHONE}`, 340, clientBoxY + 28, { align: 'right', width: 200 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#64748B')
        .text(`Email: ${BUSINESS_EMAIL}`, 340, clientBoxY + 42, { align: 'right', width: 200 });

      // --- ITEMIZED TABLE HEADER ---
      let tableY = 190;
      doc.rect(40, tableY, 515.28, 22).fill('#1E293B');

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('ITEM & DESCRIPTION', 50, tableY + 6)
        .text('QTY', 360, tableY + 6, { width: 40, align: 'center' })
        .text('RATE (UGX)', 405, tableY + 6, { width: 65, align: 'right' })
        .text('TOTAL (UGX)', 475, tableY + 6, { width: 70, align: 'right' });

      tableY += 22;

      // --- TABLE ROWS ---
      doc.font('Helvetica').fontSize(8);
      lineItems.forEach((it, i) => {
        const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, tableY, 515.28, 20).fill(rowBg);

        doc
          .fillColor('#1E293B')
          .text(it.label.slice(0, 72), 50, tableY + 5)
          .text(`${it.qty} ${it.unit}`, 360, tableY + 5, { width: 40, align: 'center' })
          .text(Number(it.rate).toLocaleString('en-US'), 405, tableY + 5, { width: 65, align: 'right' })
          .font('Helvetica-Bold')
          .text(Number(it.amount).toLocaleString('en-US'), 475, tableY + 5, { width: 70, align: 'right' })
          .font('Helvetica');

        tableY += 20;
      });

      // Bottom border for table
      doc.rect(40, tableY, 515.28, 1).fill('#CBD5E1');
      tableY += 8;

      // --- TOTALS SECTION ---
      const totalBoxY = tableY;
      doc.rect(330, totalBoxY, 225.28, 48).fillAndStroke('#FEF3C7', '#FDE68A');

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor('#92400E')
        .text('TOTAL ESTIMATE:', 345, totalBoxY + 10);

      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#B45309')
        .text(formatUgx(grandTotal), 345, totalBoxY + 24, { width: 200, align: 'right' });

      // --- PAYMENT & INSTALLATION TERMS ---
      const termsY = 560;
      doc.rect(40, termsY, 515.28, 180).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0F172A')
        .text('PAYMENT TERMS & SITE WORK COMMITMENT', 55, termsY + 12);

      const terms = [
        '1. Free Site Measurements: Confirmations and final millimeter-level drops are taken on site prior to cutting.',
        '2. Payment Terms: 70% deposit upon fabric selection & approval; 30% balance upon final installation.',
        '3. Turnaround Time: Tailoring & mounting completed within 3 to 5 business days across Greater Kampala.',
        '4. Hardware Warranty: 3-Year warranty on heavy-duty aluminum tracks and ball-bearing gliders.',
        '5. Payment Options: Bank Transfer, MTN Mobile Money (+256780983661), or Airtel Money (+256751567860).'
      ];

      doc.font('Helvetica').fontSize(8).fillColor('#475569');
      terms.forEach((t, i) => {
        doc.text(t, 55, termsY + 30 + i * 16, { width: 490 });
      });

      // WhatsApp Acceptance CTA Box
      const ctaY = termsY + 118;
      doc.rect(55, ctaY, 485.28, 44).fill('#0F172A');
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#FCD34D')
        .text('Ready to approve or request fabric swatches?', 70, ctaY + 10);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#FFFFFF')
        .text(`Click or WhatsApp "${BUSINESS_PHONE}" with quote ref ${qNum} to book installation.`, 70, ctaY + 25);

      // --- FOOTER ---
      doc.rect(0, 810, 595.28, 32).fill('#0F172A');
      doc
        .fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(7.5)
        .text('Fitbit Interiors • Premium Curtains, Sheers & Rugs • Kampala, Uganda • Instagram: @fitbit_interiors', 40, 822, {
          align: 'center',
          width: 515.28
        });

      doc.end();

      stream.on('finish', () => {
        resolve({
          quoteNumber: qNum,
          fileName: outputFileName,
          filePath: outputPath,
          grandTotal,
          grandTotalFormatted: formatUgx(grandTotal)
        });
      });

      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// Quick CLI interactive / test runner
if (require.main === module) {
  // Test quotation for a 2-bedroom modern apartment in Kyanja
  generateQuotationPdf({
    clientName: 'Silver Line Condos (Apartment 4B)',
    clientPhone: '+256754613864',
    clientLocation: 'Kyanja / Kira Road, Kampala',
    windows: [
      {
        roomName: 'Living Room Sliding Doors',
        widthMeters: 3.5,
        heightMeters: 2.7,
        includeSheer: true,
        fabricType: 'blackout_premium',
        sheerType: 'sheer_linen',
        hardwareType: 'double_track_heavy'
      },
      {
        roomName: 'Master Bedroom',
        widthMeters: 2.4,
        heightMeters: 2.5,
        includeSheer: true,
        fabricType: 'blackout_premium',
        sheerType: 'sheer_linen',
        hardwareType: 'double_track_heavy'
      },
      {
        roomName: 'Guest Bedroom',
        widthMeters: 1.8,
        heightMeters: 2.4,
        includeSheer: true,
        fabricType: 'blackout_standard',
        sheerType: 'sheer_plain',
        hardwareType: 'double_track_heavy'
      }
    ],
    addRugs: ['rug_large']
  })
    .then(res => {
      console.log(`\n[+] Generated Official Quotation PDF: ${res.fileName}`);
      console.log(`    Total: ${res.grandTotalFormatted}`);
      console.log(`    Path: ${res.filePath}`);
    })
    .catch(err => console.error('[!] Quote Error:', err));
}

module.exports = {
  PRICING_RATES,
  calculateWindowRequirements,
  generateQuotationPdf,
  formatUgx
};
