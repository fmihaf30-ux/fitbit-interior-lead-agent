# Fitbit Interiors — Full Autonomous Client Discovery & Outreach Suite (v3.0)

An end-to-end B2B client discovery, PDF catalogue generator, WhatsApp outreach builder, IMAP reply detector, and automated email/follow-up suite built for **Fitbit Interiors** ([@fitbit_interiors](https://www.instagram.com/fitbit_interiors?obrf=ZDNlZDc0MzIxNw==)).

---

## 📊 Live Google Sheets CRM Tracker
🔗 **[Open Your Fitbit Interiors Lead & Outreach Tracker](https://docs.google.com/spreadsheets/d/1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA/edit)**

---

## ✨ Complete Feature Suite

1. **1-Page PDF Trade & Hospitality Catalogue (`catalog_generator.js`):**
   - Automatically generates [`Fitbit_Interiors_Trade_Catalogue_2026.pdf`](./Fitbit_Interiors_Trade_Catalogue_2026.pdf) and attaches it to every outgoing email.
2. **Visual 3-Card Product Grid + Dual CTA Buttons (`sync.js`):**
   - Embeds a 3-column product showcase (*Bespoke Curtains & Sheers*, *Rods & Motorized Tracks*, *Modern Luxury Area Rugs*), a **View Portfolio on Instagram** button, a **Chat on WhatsApp & Request Swatches** button, and a Gmail-compliant **Unsubscribe** footer.
3. **1-Click WhatsApp Pitch Column in Google Sheets (Column L):**
   - Generates a personalized `https://wa.me/256...?text=...` link for every prospect so you can also pitch them on WhatsApp in one click directly from the spreadsheet.
4. **Automated 2-Step Follow-Up Sequence (`mailer.js`):**
   - **Day 4 (Follow-Up #1):** Offers a complimentary zero-obligation physical swatch book drop-off at their office.
   - **Day 10 (Follow-Up #2):** Final polite follow-up enclosing the 2026 PDF Specification Guide for their procurement file.
5. **IMAP Gmail Reply Detection & Auto-Stop (`reply_checker.js`):**
   - Checks `imap.gmail.com:993` before sending follow-ups. If a prospect replies, their status in Google Sheets automatically updates to **`Replied - Hot Lead`** and stops further automated emails.
6. **Full Autonomous Daily Scheduler (`scheduler.js`):**
   - Runs the entire pipeline (`Reply Check -> Web Discovery -> Follow-Ups -> Daily Batch Send -> Sheet Sync`) either on demand or on a 24-hour background schedule.

---

## 🚀 Quick Start Commands

```powershell
cd "c:\Users\ssegu\OneDrive\my projects\fitbit-interior-lead-agent"
npm.cmd start
```

| Command | Action |
| :--- | :--- |
| `npm.cmd start` | Launch the 15-option interactive control center |
| `npm.cmd run sniper` | Direct scrape Ugandan property portals for newly built listings |
| `npm.cmd run quote` | Generate instant executive curtain & rug quotation PDF |
| `npm.cmd run whatsapp` | Semi-automated WhatsApp outreach launcher for sniped leads |
| `npm.cmd run discover` | Crawl the web for new hospitality, real estate, and design leads |
| `npm.cmd run catalog` | Regenerate the 1-Page PDF Trade Catalogue |
| `npm.cmd run send` | Send initial outreach emails (with PDF Catalogue attached) |
| `npm.cmd run followup` | Run the Day-4 & Day-10 automated follow-up sequence |
| `npm.cmd run replies` | Check Gmail inbox for client replies and update Google Sheets |
| `npm.cmd run schedule` | Start the 24-hour autonomous daily outreach daemon |
