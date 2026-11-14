"""Sync prospects and generated email pitches directly into Google Sheets."""

import csv
import os
import subprocess
from config import SPREADSHEET_ID, SHEET_NAME
from prospect_database import get_all_prospects
from email_generator import generate_email_pitch


def build_leads_dataset():
    """Builds full dataset combining lead details with AI-generated email drafts."""
    prospects = get_all_prospects()
    rows = []
    
    # Headers
    headers = [
        "Lead Name",
        "Category",
        "City / Area",
        "Contact Email",
        "Phone / WhatsApp",
        "Website / Social",
        "Status",
        "Pitch Angle",
        "Subject Line",
        "Drafted Email",
        "Notes"
    ]
    rows.append(headers)

    for p in prospects:
        email_data = generate_email_pitch(p)
        status = "Drafted (Awaiting Review)"
        
        row = [
            p.get("name", ""),
            p.get("category", ""),
            p.get("city", ""),
            p.get("email", ""),
            p.get("phone", ""),
            p.get("website", ""),
            status,
            p.get("pitch_angle", ""),
            email_data.get("subject", ""),
            email_data.get("body", ""),
            p.get("notes", "")
        ]
        rows.append(row)
        
    return rows


def export_to_csv(rows, filename="leads_export.csv"):
    """Exports data cleanly to CSV handling commas and newlines."""
    filepath = os.path.abspath(filename)
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        for r in rows:
            writer.writerow(r)
    return filepath


def sync_to_google_sheet(csv_path):
    """Imports the CSV into the connected Google Sheet and applies styling."""
    print(f"[*] Importing {csv_path} to Google Sheet ID: {SPREADSHEET_ID}...")
    
    # 1. Import CSV
    cmd_import = f'gsheets mutate import-csv {SPREADSHEET_ID} "{csv_path}" --sheet "{SHEET_NAME}"'
    res = subprocess.run(cmd_import, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Error importing CSV: {res.stderr}")
        return False
    print("[+] Successfully imported leads into Google Sheet!")

    # 2. Format Header Row
    cmd_format = (
        f'gsheets mutate format {SPREADSHEET_ID} --sheet-id 0 '
        f'--start-row 0 --end-row 1 --start-col 0 --end-col 11 '
        f'--bold --align CENTER --bg-color "#1E293B" --fg-color "#FFFFFF"'
    )
    subprocess.run(cmd_format, shell=True, capture_output=True, text=True)

    # 3. Freeze Header Row
    cmd_freeze = f'gsheets mutate freeze {SPREADSHEET_ID} --sheet-id 0 --rows 1'
    subprocess.run(cmd_freeze, shell=True, capture_output=True, text=True)

    # 4. Set sensible column widths
    # Col A (Name): 220px, Col B (Category): 200px, Col D (Email): 220px, Col I (Subject): 260px, Col J (Drafted Email): 350px
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 0 --end-col 1 --pixels 220', shell=True)
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 1 --end-col 2 --pixels 210', shell=True)
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 3 --end-col 4 --pixels 220', shell=True)
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 6 --end-col 7 --pixels 180', shell=True)
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 8 --end-col 9 --pixels 280', shell=True)
    subprocess.run(f'gsheets mutate set-col-width {SPREADSHEET_ID} --sheet-id 0 --start-col 9 --end-col 10 --pixels 400', shell=True)

    print("[+] Formatted headers, frozen row, and adjusted column widths.")
    return True


if __name__ == "__main__":
    dataset = build_leads_dataset()
    csv_file = export_to_csv(dataset)
    sync_to_google_sheet(csv_file)
