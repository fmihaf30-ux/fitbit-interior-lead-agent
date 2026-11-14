require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true, quiet: true });
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const CATALOG_FILENAME = 'Fitbit_Interiors_Trade_Catalogue_2026.pdf';
const CATALOG_PATH = path.join(__dirname, CATALOG_FILENAME);

function generateTradeCataloguePdf(whatsappNumber = null) {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  whatsappNumber = whatsappNumber || process.env.BUSINESS_WHATSAPP || '+256751567860';
  const cleanPhone = whatsappNumber.replace(/["'\s]/g, '');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: 'Fitbit Interiors — Trade & Products Catalogue',
          Author: 'Fitbit Interiors (Kampala, Uganda)',
          Subject: 'Custom Curtains, Sheer Fabrics, Heavy-Duty Rods & Modern Rugs'
        }
      });

      const stream = fs.createWriteStream(CATALOG_PATH);
      doc.pipe(stream);

      // --- 1. HEADER (Deep Navy + Warm Gold Accent) ---
      doc.rect(0, 0, 595.28, 90).fill('#0F172A'); // Slate 900
      doc.rect(0, 90, 595.28, 3.5).fill('#D97706'); // Warm Amber Gold

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('FITBIT INTERIORS', 40, 24, { characterSpacing: 1.5 });

      doc
        .fillColor('#FCD34D')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('CUSTOM CURTAINS  •  SHEER FABRICS  •  RODS & TRACKS  •  MODERN RUGS', 40, 52, {
          characterSpacing: 0.5
        });

      doc
        .fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(8.5)
        .text('Product & Price Guide  |  Kampala & Countrywide Uganda', 40, 68);

      // Right header contact badge
      doc
        .fillColor('#F8FAFC')
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('CALL / WHATSAPP', 420, 28, { align: 'right', width: 135 });
      doc
        .fillColor('#FCD34D')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(cleanPhone, 420, 42, { align: 'right', width: 135 });
      doc
        .fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(8)
        .text('@fitbit_interiors', 420, 60, { align: 'right', width: 135 });

      // --- 2. SUBTITLE BANNER ---
      doc.rect(40, 106, 515.28, 36).fill('#F8FAFC');
      doc.rect(40, 106, 3, 36).fill('#D97706');

      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Supply, Precision Tailoring & Professional Installation', 52, 114);
      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(8.5)
        .text('We deliver turnkey window treatments and living-space styling for apartments, homes, hotels, and offices.', 52, 128);

      // --- 3. PRODUCT & PRICING TABLE ---
      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('INDICATIVE PRICE GUIDE (SUPPLY & INSTALLATION)', 40, 156);

      // Table Header
      const tableTop = 174;
      doc.rect(40, tableTop, 515.28, 22).fill('#1E293B');

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(8.5);
      doc.text('CATEGORY & DESCRIPTION', 50, tableTop + 6, { width: 230 });
      doc.text('IDEAL FOR', 285, tableTop + 6, { width: 130 });
      doc.text('STARTING PRICE', 425, tableTop + 6, { width: 120, align: 'right' });

      const items = [
        {
          cat: '100% Blackout Curtains',
          desc: 'High-density sunblock & heat-insulating fabrics',
          use: 'Bedrooms, Airbnb & Hotels',
          price: 'From UGX 40,000 / m'
        },
        {
          cat: 'Premium Blackout (Dubai/Turkey)',
          desc: 'Luxury textured weave, rich drape & durability',
          use: 'Master suites & Luxury villas',
          price: 'From UGX 65,000 / m'
        },
        {
          cat: 'Plain Daylight Sheers (Nets)',
          desc: 'Clean, airy daylight diffusion & privacy',
          use: 'Living rooms & Balconies',
          price: 'From UGX 25,000 / m'
        },
        {
          cat: 'Designer Embroidered Sheers',
          desc: 'Patterned voile & French textured lace',
          use: 'Executive lounges & Dining',
          price: 'From UGX 40,000 / m'
        },
        {
          cat: 'Aluminium Ceiling Tracks',
          desc: 'Silent-glide smooth runners for ceiling pelmets',
          use: 'Modern recessed ceilings',
          price: 'From UGX 18,000 / m'
        },
        {
          cat: 'Decorative Curtain Rods',
          desc: 'Heavy-duty wall rods with designer finials & rings',
          use: 'Living rooms & Bedrooms',
          price: 'From UGX 80,000 / window'
        },
        {
          cat: 'Modern Area Rugs (Medium)',
          desc: '160cm x 230cm plush geometric & abstract designs',
          use: 'Lounge, bedroom & sitting area',
          price: 'From UGX 135,000'
        },
        {
          cat: 'Luxury Large Center Rugs',
          desc: '200cm x 300cm high-density durable modern weave',
          use: 'Spacious living & dining rooms',
          price: 'From UGX 560,000'
        }
      ];

      let rowY = tableTop + 22;
      items.forEach((it, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(40, rowY, 515.28, 28).fill(bg);

        // Border line under each row
        doc.rect(40, rowY + 27.5, 515.28, 0.5).fill('#E2E8F0');

        doc
          .fillColor('#0F172A')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(it.cat, 50, rowY + 5, { width: 230 });

        doc
          .fillColor('#64748B')
          .font('Helvetica')
          .fontSize(7.5)
          .text(it.desc, 50, rowY + 16, { width: 230 });

        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(8)
          .text(it.use, 285, rowY + 10, { width: 130 });

        doc
          .fillColor('#0F172A')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(it.price, 425, rowY + 10, { width: 120, align: 'right' });

        rowY += 28;
      });

      // Note below table
      doc
        .fillColor('#64748B')
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .text('* Final quotations depend on exact window dimensions and specific fabric selection. Free site visit provided.', 40, rowY + 6);

      // --- 4. WHY PARTNER WITH US (3 Simple Cards) ---
      const cardTop = rowY + 24;
      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('HOW WE WORK WITH REAL ESTATE AGENTS & LANDLORDS', 40, cardTop);

      const cards = [
        {
          title: '1. FREE SITE MEASUREMENTS',
          desc: 'Our technician visits your property across Kampala with physical fabric swatches. Zero charge to you or the client.'
        },
        {
          title: '2. 10% REFERRAL COMMISSION',
          desc: 'We register each client you introduce and pay you 10% commission on the curtain/rug invoice via Mobile Money once paid.'
        },
        {
          title: '3. FAST 5–7 DAY TURNAROUND',
          desc: 'From measurement to tailoring and neat fitting, we ensure tenants and buyers move into a ready, fully dressed home.'
        }
      ];

      const cY = cardTop + 18;
      let cX = 40;
      const cardWidth = 165;
      cards.forEach((c) => {
        doc.rect(cX, cY, cardWidth, 80).fillAndStroke('#FAF9F6', '#E2E8F0');
        doc.rect(cX, cY, cardWidth, 3).fill('#D97706');

        doc
          .fillColor('#0F172A')
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(c.title, cX + 8, cY + 12, { width: cardWidth - 16 });

        doc
          .fillColor('#475569')
          .font('Helvetica')
          .fontSize(7.8)
          .text(c.desc, cX + 8, cY + 28, { width: cardWidth - 16, lineGap: 1.5 });

        cX += cardWidth + 10.14;
      });

      // --- 5. WORKFLOW STEPS ---
      const flowTop = cY + 92;
      doc.rect(40, flowTop, 515.28, 42).fill('#F1F5F9');

      doc
        .fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('SIMPLE 4-STEP PROCESS:', 52, flowTop + 8);

      doc
        .fillColor('#334155')
        .font('Helvetica')
        .fontSize(8)
        .text('Share client contact  ->  We visit with fabric swatches & measure  ->  Client approves quote  ->  We tailor & install neatly', 52, flowTop + 24);

      // --- 6. FOOTER (Professional Slate) ---
      doc.rect(0, 755, 595.28, 87).fill('#0F172A');
      doc.rect(0, 755, 595.28, 3).fill('#D97706');

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('FITBIT INTERIORS — WE CREATE BEAUTIFUL SPACES', 40, 770);

      doc
        .fillColor('#CBD5E1')
        .font('Helvetica')
        .fontSize(8.5)
        .text(`WhatsApp / Direct Call: ${cleanPhone}   |   Email: sseguyafahim1@gmail.com`, 40, 788)
        .text('Instagram Portfolio: https://www.instagram.com/fitbit_interiors', 40, 802)
        .text('Service Areas: Ntinda, Kira, Kololo, Naguru, Naalya, Lubowa, Kyanja & Countrywide Uganda', 40, 816);

      doc.end();

      stream.on('finish', () => {
        console.log(`[+] Successfully generated clean & professional catalogue: ${CATALOG_PATH}`);
        resolve(CATALOG_PATH);
      });
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

if (require.main === module) {
  generateTradeCataloguePdf().catch(err => console.error('[!] PDF Error:', err));
}

module.exports = { generateTradeCataloguePdf, CATALOG_PATH, CATALOG_FILENAME };
