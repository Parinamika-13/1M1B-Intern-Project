import pandas as pd
import json
import os
import math

excel_file = "My_Sustainable_Workforce_Dataset_200_Employees.xlsx"
output_dir = "frontend/src/data"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

if not os.path.exists(excel_file):
    raise FileNotFoundError(f"{excel_file} not found.")

def clean_value(val):
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    elif pd.isna(val):
        return None
    return val

def clean_record(record):
    return {k: clean_value(v) for k, v in record.items()}

xls = pd.ExcelFile(excel_file)
for sheet in xls.sheet_names:
    print(f"Converting sheet: {sheet}")
    df = pd.read_excel(xls, sheet)
    
    # Convert df to dict records
    raw_records = df.to_dict(orient="records")
    clean_records = [clean_record(rec) for rec in raw_records]
    
    output_file = os.path.join(output_dir, f"{sheet.lower()}.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(clean_records, f, indent=2, ensure_ascii=False)
    
    # Validation step: Parse the written JSON back to verify correctness
    with open(output_file, "r", encoding="utf-8") as f:
        try:
            json.load(f)
            print(f"Successfully validated {sheet.lower()}.json (Valid JSON)")
        except json.JSONDecodeError as e:
            print(f"FAILED validation for {sheet.lower()}.json: {e}")
            raise

print("Conversion and validation complete!")
