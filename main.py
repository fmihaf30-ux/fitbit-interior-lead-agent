"""Main interactive CLI for Fitbit Interiors Client Lead & Outreach Agent."""

import sys
import os
from config import BUSINESS_NAME, BUSINESS_INSTAGRAM, SPREADSHEET_URL, SPREADSHEET_ID
from prospect_database import get_all_prospects, PROSPECTS_POOL
from email_generator import generate_email_pitch
from sync_to_sheets import build_leads_dataset, export_to_csv, sync_to_google_sheet


def display_banner():
    print("=" * 68)
    print(f"      {BUSINESS_NAME} - B2B CLIENT OUTREACH AGENT")
    print(f"      Targeting: Interior Designers | Hotels/Airbnbs | Developers")
    print("=" * 68)
    print(f"Instagram: {BUSINESS_INSTAGRAM}")
    print(f"Google Sheet: {SPREADSHEET_URL}")
    print("-" * 68)


def list_prospects():
    prospects = get_all_prospects()
    print(f"\n[+] Total Discovered Leads: {len(prospects)}\n")
    for idx, p in enumerate(prospects, 1):
        print(f"{idx:2d}. {p['name']} | {p['category']}")
        print(f"    Location: {p['city']} | Email: {p['email']} | Phone: {p['phone']}")
        print(f"    Angle: {p['pitch_angle']}")
        print()


def preview_drafts():
    prospects = get_all_prospects()
    print(f"\nSelect a prospect to preview drafted outreach email (1 - {len(prospects)}) or 'all':")
    choice = input("Enter number: ").strip()

    if choice.lower() == "all":
        selected = prospects
    else:
        try:
            val = int(choice)
            if 1 <= val <= len(prospects):
                selected = [prospects[val - 1]]
            else:
                print("[!] Invalid selection.")
                return
        except ValueError:
            print("[!] Invalid input.")
            return

    for p in selected:
        pitch = generate_email_pitch(p)
        print("\n" + "=" * 65)
        print(f"TO: {p['name']} <{p['email']}>")
        print(f"CATEGORY: {p['category']}")
        print(f"SUBJECT: {pitch['subject']}")
        print("-" * 65)
        print(pitch['body'])
        print("=" * 65)


def add_custom_lead():
    print("\n--- Add New Potential Client ---")
    name = input("Company / Client Name: ").strip()
    if not name:
        print("[!] Name cannot be empty.")
        return

    print("Choose Category:")
    print("1. Interior Designers & Decorators")
    print("2. Serviced Apartments & Boutique Hotels")
    print("3. Real Estate Developers & Property Managers")
    print("4. Corporate Offices & Commercial Spaces")
    cat_choice = input("Select (1-4): ").strip()
    cat_map = {
        "1": "Interior Designers & Decorators",
        "2": "Serviced Apartments & Boutique Hotels",
        "3": "Real Estate Developers & Property Managers",
        "4": "Corporate Offices & Commercial Spaces"
    }
    category = cat_map.get(cat_choice, "Interior Designers & Decorators")

    city = input("Location / Area (e.g. Kololo, Kampala): ").strip() or "Kampala"
    email = input("Contact Email: ").strip()
    phone = input("Phone / WhatsApp: ").strip()
    website = input("Website or Social link: ").strip()
    pitch_angle = input("Specific pitch angle (optional): ").strip() or "Turnkey Soft Furnishing Partnership"
    notes = input("Internal notes (optional): ").strip()

    new_prospect = {
        "name": name,
        "category": category,
        "city": city,
        "email": email,
        "phone": phone,
        "website": website,
        "pitch_angle": pitch_angle,
        "notes": notes
    }
    PROSPECTS_POOL.append(new_prospect)
    print(f"[+] Successfully added '{name}' to active leads pool!")


def sync_leads():
    print("\n[*] Preparing leads and generating custom emails...")
    dataset = build_leads_dataset()
    csv_path = export_to_csv(dataset)
    success = sync_to_google_sheet(csv_path)
    if success:
        print("\n[SUCCESS] All leads and email drafts are now live in your Google Sheet!")
        print(f"Open link to review: {SPREADSHEET_URL}\n")


def menu():
    while True:
        display_banner()
        print("1. List All Discovered Leads")
        print("2. Preview Tailored Email Drafts")
        print("3. Push All Leads & Drafts to Google Sheets")
        print("4. Add New Custom Lead")
        print("5. Open Google Sheet in Browser")
        print("6. Exit")
        choice = input("\nEnter choice (1-6): ").strip()

        if choice == "1":
            list_prospects()
        elif choice == "2":
            preview_drafts()
        elif choice == "3":
            sync_leads()
        elif choice == "4":
            add_custom_lead()
        elif choice == "5":
            print(f"\nOpening {SPREADSHEET_URL} ...")
            os.system(f'start "" "{SPREADSHEET_URL}"')
        elif choice == "6":
            print("\nExiting agent. Happy selling!")
            break
        else:
            print("\n[!] Invalid choice, try again.")
        input("\nPress Enter to return to main menu...")


if __name__ == "__main__":
    menu()
