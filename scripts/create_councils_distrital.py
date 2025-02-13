import json
import os
from datetime import datetime
import shutil
import copy
import random

def generate_unique_username(base_username, users):
    """Generates a unique username by appending a number if necessary"""
    usernames = {user["username"] for user in users}
    if base_username not in usernames:
        return base_username
    
    i = 1
    while f"{base_username}{i}" in usernames:
        i += 1
    return f"{base_username}{i}"

def get_district_names():
    return [
        "Rede de Distribuição", "Rede de Serviços", "Industrial", "do Campo"
    ]

def to_roman(n):
    roman_numerals = {
        1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
        6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
    }
    return roman_numerals.get(n, str(n))

def create_district_councils():
    # Setup paths
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    backup_dir = os.path.join(current_dir, "..", "data", "backups")

    # Create backup
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"data_backup_{timestamp}.json")
    
    # Load data
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Create backup
    shutil.copy2(data_path, backup_path)
    
    # Get templates
    template_distribution = data.get("Conselho Popular Distrital de Rede de Distribuição da Posse", {})
    template_services = data.get("Conselho Popular Distrital de Rede de Serviços da Posse", {})
    template_industrial = data.get("Conselho Popular Distrital de Fábrica de Industrial II", {})
    template_field = data.get("Conselho Popular Distrital de Fábrica de Industrial II", {})
    
    if not (template_distribution and template_services and template_industrial and template_field):
        print("One or more template councils not found!")
        return
    
    # Load district names
    district_names = get_district_names()
    
    # Process each municipal council
    for council_name in list(data.keys()):
        if "Conselho Popular Municipal" in council_name:
            # Create four new district councils
            for district_name in district_names:
                new_council_base = f"Conselho Popular Distrital de {district_name} de {council_name.split(' de ')[-1]}"
                new_council = new_council_base
                
                # Add Roman numerals if council already exists
                i = 1
                while new_council in data:
                    i += 1
                    new_council = f"{new_council_base} {to_roman(i)}"
                
                # Select the appropriate template
                if district_name == "Rede de Distribuição":
                    new_council_data = copy.deepcopy(template_distribution)
                elif district_name == "Rede de Serviços":
                    new_council_data = copy.deepcopy(template_services)
                elif district_name == "Industrial":
                    new_council_data = copy.deepcopy(template_industrial)
                elif district_name == "do Campo":
                    new_council_data = copy.deepcopy(template_field)
                
                new_council_data["conselhoPopularAssociadoDeConselhoPopular"] = council_name
                
                # Add council to data
                data[new_council] = new_council_data
                print(f"Created council: {new_council} associated with {council_name}")
                
                # Create associated user
                full_name = f"User {new_council}"
                base_username = full_name.split()[0].lower()
                username = generate_unique_username(base_username, data["users"])
                
                new_user = {
                    "username": username,
                    "password": "123",
                    "name": full_name,
                    "pronoun": random.choice(["masculino", "feminino"]),
                    "instance": "Conselho Popular Distrital",
                    "preposition": "de",
                    "jurisdiction": district_name,
                    "instancePrepositionJurisdictionUUID": new_council
                }
                
                data["users"].append(new_user)
                print(f"Created user: {username} for council: {new_council}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("District councils creation completed!")

if __name__ == "__main__":
    create_district_councils()