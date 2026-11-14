"""AI-driven tailored email pitch generator for Fitbit Interiors."""

from config import BUSINESS_NAME, BUSINESS_INSTAGRAM


def generate_email_pitch(prospect):
    """
    Generates a personalized, high-converting cold email tailored to the prospect's category.
    Returns a dict with 'subject' and 'body'.
    """
    category = prospect.get("category", "")
    name = prospect.get("name", "Team")
    city = prospect.get("city", "Kampala")

    if "Interior Designer" in category:
        subject = f"Trade Partnership: Reliable Custom Curtains, Rods & Rugs for {name} Projects"
        body = f"""Hello {name} Team,

I hope your week is off to a productive start.

I follow your interior design and refurbishment work in {city} and really appreciate your attention to design detailing and modern space finishing.

I am reaching out from {BUSINESS_NAME}. We specialize in custom-tailored luxury curtains (heavy blackouts, textured sheers, pinch-pleats), heavy-duty curtain rods and motorized tracks, as well as modern accent rugs.

We know that for interior designers, managing fabric sourcing, accurate measurements, tailor quality, and prompt hanging is often one of the biggest bottlenecks on site handovers. 

We would love to serve as your dedicated fabrication and installation trade partner in Kampala:
• Trade Discounts: Exclusive partner rates so you preserve healthy margins.
• Swatches to Your Door: We bring physical fabric sample books directly to your office or client site.
• Full On-Site Service: Free laser measurements, custom stitching, and flawless installation by our team.

You can preview our latest fabrics and recent client installations on Instagram:
{BUSINESS_INSTAGRAM}

Could we deliver a sample swatch book to your office sometime next week to explore a potential collaboration?

Warm regards,

Client Partnerships Team
{BUSINESS_NAME}
Kampala, Uganda | Countrywide Delivery & Installation
Instagram: {BUSINESS_INSTAGRAM}
"""

    elif "Serviced Apartments" in category or "Hotel" in category:
        subject = f"Elevating Guest Experience at {name} (Luxury Blackout Curtains, Rods & Rugs)"
        body = f"""Hello {name} Team,

I hope all is well with you.

Guests booking extended stays and luxury suites at {name} in {city} expect both premium aesthetic comfort and uninterrupted sleep. High-quality blackout drapery and acoustic soft furnishings play a huge role in achieving 5-star guest reviews.

I am contacting you from {BUSINESS_NAME}. We supply and install:
1. Hotel-Grade 100% Blackout Curtains & Sheers: Washable, durable, and sunlight-resistant fabrics designed for high turnover.
2. Silent-Glide Heavy Curtain Rods & Pelmet Tracks: Smooth, durable tracks that withstand frequent guest handling.
3. Modern Stain-Resistant Area Rugs: High-density living and bedroom rugs that absorb sound and enhance room warmth.

We take care of everything seamlessly without disrupting your guests: accurate measurements, fast turnaround tailoring, and clean installation scheduled between checkout hours.

Take a look at our catalogue and recent project styles here:
{BUSINESS_INSTAGRAM}

Would you be open to a quick 10-minute on-site visit or review of our fabric swatches for your upcoming room refreshes?

Best regards,

Hospitality Furnishing Team
{BUSINESS_NAME}
Kampala, Uganda
Instagram: {BUSINESS_INSTAGRAM}
"""

    elif "Real Estate" in category or "Property" in category:
        subject = f"Turnkey Window & Soft Furnishing Packages for {name} Properties"
        body = f"""Hello {name} Management,

I hope you are doing well.

As new residents and corporate tenants move into your residential and commercial properties in {city}, window treatments (curtains, rods, and blinds) and floor styling are consistently among the first urgent requirements before occupancy.

At {BUSINESS_NAME}, we partner with property developers and asset managers across Kampala to offer turnkey soft-furnishing packages:
• Bulk Buyer & Landlord Pricing: Cost-effective packages for full apartment complexes or staged show-units.
• Turnkey Delivery & Installation: Precision measuring, custom stitching, and secure mounting of curtain rods/tracks on scheduled handover dates.
• Move-In Packages for Buyers: Optional curated curtain & rug bundles offered directly to new homeowners during completion.

You can view our portfolio of installed window finishes and textiles on our official page:
{BUSINESS_INSTAGRAM}

We would welcome the opportunity to submit a sample quotation or supply catalogue for your current developments. Could we arrange a brief call or meeting with your property/procurement manager this week?

Kind regards,

Corporate Projects Lead
{BUSINESS_NAME}
Kampala, Uganda
Instagram: {BUSINESS_INSTAGRAM}
"""

    else:
        # Commercial / General
        subject = f"Commercial Window Solutions & Rugs for {name}"
        body = f"""Hello {name} Team,

I hope you are having a great week.

I am writing from {BUSINESS_NAME} regarding custom interior window treatments, drapery tracks, and interior floor coverings for commercial and office spaces in {city}.

Whether you are updating boardroom acoustic aesthetics, glare-reducing window sheers, or modern entrance rugs, our team handles end-to-end measurement, custom tailoring, and swift on-site fitting.

You can explore our portfolio and design finishes on Instagram:
{BUSINESS_INSTAGRAM}

Please let us know if we can share a digital catalogue or schedule a brief meeting to discuss your furnishing needs.

Sincerely,

{BUSINESS_NAME} Team
Kampala, Uganda
Instagram: {BUSINESS_INSTAGRAM}
"""

    return {
        "subject": subject.strip(),
        "body": body.strip()
    }
