import json
import os
import random
from datetime import datetime
import shutil

def get_random_value():
    rand = random.random() * 100
    
    if rand <= 81:  # 81% chance
        return round(random.uniform(0.00001, 0.00499), 2)
    elif rand <= 93:  # 12% chance
        return 0.005
    elif rand <= 98:  # 5% chance
        return round(random.uniform(0.00005, 0.00008), 2)
    else:  # 2% chance
        return 0.02

def randomize_vectors(data):
    for key, entity in data.items():
        # Check if entity is a committee
        if isinstance(entity, dict) and "Comitê" in key:
            if "vetorTecnologico" in entity:
                # Get current vector length
                vector_length = len(entity["vetorTecnologico"])
                # Create new random vector
                new_vector = [get_random_value() for _ in range(vector_length)]
                # Update vector
                entity["vetorTecnologico"] = new_vector
    
    return data

def main():
    # Load data
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Create backup
    backup_dir = os.path.join(current_dir, "..", "data", "backups")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"data_backup_{timestamp}.json")
    shutil.copy2(data_path, backup_path)
    
    # Update vectors
    updated_data = randomize_vectors(data)
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)
    
    print("Technological vectors randomized successfully")

if __name__ == "__main__":
    main()