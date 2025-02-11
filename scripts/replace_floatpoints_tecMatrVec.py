import json
import os
from datetime import datetime
import shutil
import re

def format_all_numbers(data):
    # Convert to string to do replacements
    data_str = json.dumps(data, indent=2)
    
    # Define patterns for both types of arrays
    patterns = [
        r'("inputTable":\s*\[\s*\[[\s\S]*?\]\s*\])',  # inputTable pattern
        r'("vetorTecnologico":\s*\[\s*[\d\.\,\s]*\])'  # vetorTecnologico pattern
    ]
    
    def replace_in_block(match):
        block = match.group(0)
        # Replace "0." with "0.000" only in numbers
        return re.sub(r'([\[,\s])0\.', r'\g<1>0.000', block)
    
    # Apply replacements for both patterns
    formatted_str = data_str
    for pattern in patterns:
        formatted_str = re.sub(pattern, replace_in_block, formatted_str)
    
    # Convert back to JSON
    return json.loads(formatted_str)

def main():
    # Setup paths
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    
    # Create backup
    backup_dir = os.path.join(current_dir, "..", "data", "backups")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"data_backup_{timestamp}.json")
    shutil.copy2(data_path, backup_path)
    
    # Load and process data
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Format numbers in both types of arrays
    formatted_data = format_all_numbers(data)
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(formatted_data, f, ensure_ascii=False, indent=2)
    
    print("Numbers formatted successfully in both inputTable and vetorTecnologico arrays")

if __name__ == "__main__":
    main()