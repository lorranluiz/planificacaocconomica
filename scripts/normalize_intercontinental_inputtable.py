import json
import os
import shutil
from datetime import datetime

def normalize_input_table(input_table):
    if not input_table:
        return input_table
    num_rows = len(input_table)
    num_cols = len(input_table[0])
    # Normalize each column separately.
    for col in range(num_cols):
        col_sum = 0
        for row in input_table:
            cell = row[col]
            # Consider only numeric values.
            if isinstance(cell, (int, float)):
                col_sum += cell
        # If the sum of the column is >= 0.9, scale each numeric cell.
        if col_sum >= 0.9 and col_sum > 0:
            factor = 0.9 / col_sum
            for i in range(num_rows):
                if isinstance(input_table[i][col], (int, float)):
                    input_table[i][col] = round(input_table[i][col] * factor, 2)
    return input_table

def normalize_matrix(matrix):
    normalized = []
    for row in matrix:
        # First replace all zeros with 0.01
        modified_row = [0.01 if x == 0 else x for x in row]
        
        # Calculate sum and normalize
        row_sum = sum(modified_row)
        if row_sum > 0:
            normalized_row = [x/row_sum for x in modified_row]
            # Ensure minimum 0.01
            normalized_row = [max(0.01, x) for x in normalized_row]
            # Final normalization to ensure sum = 1
            row_sum = sum(normalized_row)
            normalized_row = [x/row_sum for x in normalized_row]
        else:
            # If row was all zeros, create equal distribution
            normalized_row = [1.0/len(row) for _ in row]
            
        normalized.append(normalized_row)
    return normalized

def main():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    council_key = "Conselho Popular Intercontinental da Terra"
    if council_key in data and isinstance(data[council_key], dict):
        council = data[council_key]
        if "inputTable" in council and isinstance(council["inputTable"], list):
            # Step 1: Initial normalization to balance rows
            balanced_table = normalize_input_table(council["inputTable"])
            
            # Step 2: Replace any remaining zeros with 0.01 and renormalize
            final_table = normalize_matrix(balanced_table)
            
            # Save normalized result
            council["inputTable"] = final_table
            print(f"Normalized inputTable for council '{council_key}'.")
        else:
            print(f"No valid inputTable found in council '{council_key}'.")
    else:
        print(f"Council '{council_key}' not found in data.")
    
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# Setup paths.
current_dir = os.path.dirname(__file__)
data_path = os.path.join(current_dir, "..", "data", "data.json")
backup_dir = os.path.join(current_dir, "..", "data", "backups")

# Load existing data.
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Select the 'Conselho Popular Intercontinental da Terra'.
council_key = "Conselho Popular Intercontinental da Terra"
if council_key in data and isinstance(data[council_key], dict):
    council = data[council_key]
    if "inputTable" in council and isinstance(council["inputTable"], list):
        normalize_input_table(council["inputTable"])
        print(f"Normalized inputTable for council '{council_key}'.")
    else:
        print(f"No valid inputTable found in council '{council_key}'.")
else:
    print(f"Council '{council_key}' not found in data.")

# Backup the current data.json before writing changes.
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)
timestamp = datetime.now().strftime("%S%M%H%d%m%Y")
backup_filename = f"dataBackup{timestamp}.json"
backup_path = os.path.join(backup_dir, backup_filename)
shutil.copy2(data_path, backup_path)
print(f"Backup created at '{backup_path}'.")

# Write the updated data back to data.json.
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Normalization of 'inputTable' for 'Conselho Popular Intercontinental da Terra' completed.")