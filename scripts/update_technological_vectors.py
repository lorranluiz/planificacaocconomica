import json
import os
from datetime import datetime
import shutil

def load_data():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def update_technological_vectors(data):
    # Get Intercontinental Council data
    council = data["Conselho Popular Intercontinental da Terra"]
    input_table = council["inputTable"]
    product_names = council["productNames"]
    sector_names = council["sectorNames"]
    
    # Process each committee
    for key, entity in data.items():
        if isinstance(entity, dict) and "Comitê" in key:
            # Get committee's sector
            sector = entity.get("setorUnidade", "")
            if not sector:
                continue
                
            # Find sector column index
            try:
                sector_idx = sector_names.index(sector)
            except ValueError:
                continue
                
            # Get product names from estoqueDemanda
            committee_products = []
            for item in entity.get("estoqueDemanda", []):
                if "bemDeProducao" in item:
                    committee_products.append(item["bemDeProducao"])
                    
            # Build technological vector
            tech_vector = []
            for prod in committee_products:
                try:
                    # Find product row index
                    prod_idx = product_names.index(prod)
                    # Get coefficient from input_table
                    coef = input_table[prod_idx][sector_idx]
                    tech_vector.append(coef)
                except ValueError:
                    tech_vector.append(0.01)  # Default value if not found
                    
            # Update committee's technological vector
            entity["vetorTecnologico"] = tech_vector
            
    return data

def main():
    # Load data
    data = load_data()
    
    # Create backup
    current_dir = os.path.dirname(__file__)
    backup_dir = os.path.join(current_dir, "..", "data", "backups")
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"dataBackup{timestamp}.json")
    shutil.copy2(data_path, backup_path)
    
    # Update vectors
    updated_data = update_technological_vectors(data)
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)
    
    print("Technological vectors updated successfully")

if __name__ == "__main__":
    main()