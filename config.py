"""Configuration settings for Fitbit Interiors Client Discovery & Outreach Agent."""

import os

# Business Information
BUSINESS_NAME = "Fitbit Interiors"
BUSINESS_INSTAGRAM = "https://www.instagram.com/fitbit_interiors?obrf=ZDNlZDc0MzIxNw=="
CONTACT_LOCATION = "Kampala, Uganda (Delivering Countrywide)"
CORE_PRODUCTS = [
    "Custom tailored curtains (Luxury sheers, Blackout fabrics, Pinch pleat, Eyelet)",
    "Heavy-duty curtain rods, pelmets, and motorized tracks",
    "Modern premium area rugs & carpets",
    "Cushions, upholstery textiles, and window accessories"
]
CORE_SERVICES = [
    "Free on-site measurements across Kampala and surrounding areas",
    "Physical fabric swatch books brought to client/designer location",
    "Customized tailoring and rapid turnaround",
    "Full professional installation by experienced technicians"
]

# Google Sheets Configuration
SPREADSHEET_ID = "1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA"
SHEET_NAME = "Sheet1"
SPREADSHEET_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit"

# Target Categories
CATEGORIES = {
    "DESIGNER": "Interior Designers & Decorators",
    "HOSPITALITY": "Serviced Apartments & Boutique Hotels",
    "REAL_ESTATE": "Real Estate Developers & Property Managers",
    "COMMERCIAL": "Corporate Offices & Commercial Spaces"
}
