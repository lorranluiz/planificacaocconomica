import json
import os
import random
from datetime import datetime
import shutil
import re

def get_random_value():
    rand = random.random() * 100
    
    if rand <= 81:  # 81% chance
        return round(random.uniform(0.00001, 0.00499), 5)
    elif rand <= 93:  # 12% chance
        return 0.00500
    elif rand <= 98:  # 5% chance
        return round(random.uniform(0.00501, 0.00800), 5)
    else:  # 2% chance
        return 0.00900

def replace_numbers_with_random(match):
    block = match.group(0)
    # Find all numbers in the block
    number_pattern = r'[\[,\s](0\.\d+|0|0\.)'
    
    def replace_number(num_match):
        return num_match.group(0)[0] + str(get_random_value())
    
    return re.sub(number_pattern, replace_number, block)

def randomize_all_numbers(data):
    # Convert to string to do replacements
    data_str = json.dumps(data, indent=2)
    
    # Define patterns for both types of arrays
    patterns = [
        r'("inputTable":\s*\[\s*\[[\s\S]*?\]\s*\])',  # inputTable pattern
        r'("vetorTecnologico":\s*\[\s*[\d\.\,\s]*\])'  # vetorTecnologico pattern
    ]
    
    # Apply replacements for both patterns
    formatted_str = data_str
    for pattern in patterns:
        formatted_str = re.sub(pattern, replace_numbers_with_random, formatted_str)
    
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
    
    # Randomize numbers in both types of arrays
    randomized_data = randomize_all_numbers(data)
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(randomized_data, f, ensure_ascii=False, indent=2)
    
    print("Numbers randomized successfully in both inputTable and vetorTecnologico arrays")

if __name__ == "__main__":
    main()