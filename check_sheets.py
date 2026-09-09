# Required sheets based on code analysis

print("\n" + "="*70)
print("AIR SYSTEM - Required Sheets")
print("="*70)
print("\nFrom apps-script-deploy/02-air-system/Code.gs:")
print("\nRequired Active Sheets:")
air_required = [
    'records_em_B10',
    'records_em_B12', 
    'records_em_B16',
    'records_em_OT',   # ← Building 11, 19 go here
    'records_ca_B10',
    'records_ca_B12',
    'records_ca_B16',
    'records_ca_OT',   # ← Building 11, 19 go here
]

for sheet in air_required:
    print(f"  - {sheet}")

print("\nOther Required Sheets:")
air_other = ['database_em', 'database_ca', 'logs']
for sheet in air_other:
    print(f"  - {sheet}")

print("\n" + "="*70)
print("WATER SYSTEM - Required Sheets")
print("="*70)
print("\nFrom apps-script-deploy/04-water-system/Code.gs:")
print("\nRequired Active Sheets:")
water_required = [
    'records_pw_prw_B10',
    'records_pw_prw_B12',
    'records_pw_prw_B16',
    'records_pw_prw_OT',
    'records_wfi_B16',
    'records_wfi_OT',
]

for sheet in water_required:
    print(f"  - {sheet}")

print("\nOther Required Sheets:")
water_other = ['database', 'logs']
for sheet in water_other:
    print(f"  - {sheet}")

print("\nLegacy/Optional Sheets:")
water_legacy = ['records_pq_old', 'records_pq_ocl', 'records_ra6', 'records_wfi_pq', 'records_wfi']
for sheet in water_legacy:
    print(f"  - {sheet}")

print("\n" + "="*70)
print("CV SYSTEM - Required Sheets")
print("="*70)
print("\nFrom code analysis:")
cv_required = ['records_cv', 'database_cv', 'logs']
for sheet in cv_required:
    print(f"  - {sheet}")

print("\n" + "="*70)
print("NEXT STEPS")
print("="*70)
print("""
1. Open each Google Sheet URL and check if these tabs exist at the bottom
2. If missing, run the setup menu in Apps Script:
   - Air: "ANF3 Air System → 2) Setup approved active tabs"
   - Water: "ANF3 Water System → 2) Setup approved active tabs"  
   - CV: "ANF3 CV System → 2) Setup approved active tabs"
3. Deploy new version after setup
""")

