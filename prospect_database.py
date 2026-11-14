"""Lead Database and Discovery Source for Fitbit Interiors."""

PROSPECTS_POOL = [
    # 1. Interior Designers & Decorators
    {
        "name": "Nina Interiors Ltd",
        "category": "Interior Designers & Decorators",
        "city": "Kampala (Jinja Road)",
        "email": "info@ninainteriors.co.ug",
        "phone": "+256 414 258 703",
        "website": "https://merchandiseuganda.com/profile/nina-interiors-ltd",
        "pitch_angle": "Trade Partnership - Subcontracting / Custom Curtains & Rug Supply",
        "notes": "Large established interior and space planning firm. Pitch trade discount & reliable curtain fabrication."
    },
    {
        "name": "Optimum Interior Designs Uganda",
        "category": "Interior Designers & Decorators",
        "city": "Kampala (Nansana / Greater Kampala)",
        "email": "admin@optimuminteriordesigns.com",
        "phone": "+256 701 567 890",
        "website": "https://optimuminteriordesigns.com",
        "pitch_angle": "Designer Trade Collaboration - Tailoring & Installation Partner",
        "notes": "Residential and commercial interior styling. Offer to supply swatches and handle measurement + hanging."
    },
    {
        "name": "Affinity Impressions Ltd",
        "category": "Interior Designers & Decorators",
        "city": "Kampala (Kireka)",
        "email": "affinityimpressionsltd2016@gmail.com",
        "phone": "+256 772 123 456",
        "website": "https://affinityimpressionsltd.com",
        "pitch_angle": "Turnkey Office & Residential Textile Supplies",
        "notes": "Specializes in office refurbishments and residential styling."
    },
    {
        "name": "Timeline Interiors & Gypsum",
        "category": "Interior Designers & Decorators",
        "city": "Kampala",
        "email": "gypsuminteriors5@gmail.com",
        "phone": "+256 782 987 654",
        "website": "https://starofservice.co.ug",
        "pitch_angle": "Finishing Stage Window Treatment Subcontractor",
        "notes": "Handles gypsum ceilings and renovations. Perfect partner once ceiling works are completed."
    },

    # 2. Serviced Apartments & Boutique Hotels
    {
        "name": "The 17 Apartment Hotel",
        "category": "Serviced Apartments & Boutique Hotels",
        "city": "Kololo, Kampala",
        "email": "the17onthehill@gmail.com",
        "phone": "+256 704 171 717",
        "website": "https://theeye.ug",
        "pitch_angle": "Luxury Hospitality Blackout Curtains & Acoustic Rugs",
        "notes": "Upscale serviced suites in Kololo hill. Needs high-durability fabrics and blackout solutions for guest sleep."
    },
    {
        "name": "Mestil Hotel & Residences",
        "category": "Serviced Apartments & Boutique Hotels",
        "city": "Nsambya, Kampala",
        "email": "sales.executive@mestilhotels.com",
        "phone": "+256 312 400 000",
        "website": "https://mestilhotels.com",
        "pitch_angle": "Apartment Suite Refresh - Bulk Curtain Rods & Sheers",
        "notes": "Major luxury residential and serviced apartment complex."
    },
    {
        "name": "Zara Garden Hotel and Apartments",
        "category": "Serviced Apartments & Boutique Hotels",
        "city": "Muyenga, Kampala",
        "email": "reservations@zaragardenhotel.com",
        "phone": "+256 756 800 200",
        "website": "https://zaragardenhotel.com",
        "pitch_angle": "Turnkey Room Soft-Furnishing Package",
        "notes": "Apartments and boutique rooms in Muyenga. Pitch curtain replacement and washable rugs."
    },
    {
        "name": "Buziga Hotel & Serviced Apartments",
        "category": "Serviced Apartments & Boutique Hotels",
        "city": "Buziga / Ggaba, Kampala",
        "email": "info@buzigahotel.com",
        "phone": "+256 414 670 100",
        "website": "https://buzigahotel.com",
        "pitch_angle": "Scenic Lakeview Heavy Drapery & Sheers",
        "notes": "High sunlight exposure over Buziga hill requires UV-resistant sheers and blackout curtains."
    },
    {
        "name": "Pearl Boutique Hotel",
        "category": "Serviced Apartments & Boutique Hotels",
        "city": "Ntinda (Ministers Village), Kampala",
        "email": "info@pearlboutiquehotels.com",
        "phone": "+256 777 444 333",
        "website": "https://pearlboutiquehotels.com",
        "pitch_angle": "Boutique Aesthetic Curtains & Accent Rugs",
        "notes": "Boutique decor focused on intimate hospitality aesthetic."
    },

    # 3. Real Estate Developers & Property Managers
    {
        "name": "Knight Frank Uganda",
        "category": "Real Estate Developers & Property Managers",
        "city": "Kampala (Yusuf Lule Road)",
        "email": "info@ug.knightfrank.com",
        "phone": "+256 752 741 391",
        "website": "https://www.knightfrank.ug",
        "pitch_angle": "Approved Vendor for Managed Properties - Window Treatments",
        "notes": "Manages premier commercial and residential developments across Kampala."
    },
    {
        "name": "Fakhruddin Properties Uganda",
        "category": "Real Estate Developers & Property Managers",
        "city": "Kampala (Kungu / Kira)",
        "email": "enquiry@fakhruddinproperties.com",
        "phone": "+256 700 888 999",
        "website": "https://fakhruddinproperties.com",
        "pitch_angle": "Handover-Ready Window Packages for New Apartment Buyers",
        "notes": "Developers of residential projects like Orchid Rise. Propose buyer-move-in curtain packages."
    },
    {
        "name": "Comeagain Investment Company",
        "category": "Corporate Offices & Commercial Spaces",
        "city": "Kampala (Luwum Street / CBD)",
        "email": "sales@comeagaininvestments.com",
        "phone": "+256 752 333 222",
        "website": "https://comeagaininvestments.com",
        "pitch_angle": "Commercial Grade Tracks & Heavy Duty Textiles",
        "notes": "Commercial real estate & business hub in central Kampala."
    }
]


def get_all_prospects():
    """Returns the curated list of prospects."""
    return PROSPECTS_POOL


def filter_by_category(category_name):
    """Filters prospects by matching category string."""
    return [p for p in PROSPECTS_POOL if category_name.lower() in p["category"].lower()]
