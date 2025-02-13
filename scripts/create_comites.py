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

def get_factory_names():
    return [
        "Esperança", "Progresso", "União", "Trabalho", "Futuro", "Inovação", "Desenvolvimento", "Força", "Determinação", "Excelência"
    ]

def get_field_names():
    return [
        "Fazenda Alegria", "Sítio Harmonia", "Fazenda Prosperidade", "Sítio Esperança", "Fazenda União", "Sítio Tranquilidade", "Fazenda Vitória", "Sítio Felicidade", "Fazenda Paz", "Sítio Serenidade"
    ]

def to_roman(n):
    roman_numerals = {
        1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
        6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
    }
    return roman_numerals.get(n, str(n))

def create_comites():
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
    template_factory = data.get("Comitê de Fábrica da Santa Maria 3", {})
    template_field = data.get("Comitê do Campo da Liberdade", {})
    
    if not (template_factory and template_field):
        print("One or more template comites not found!")
        return
    
    # Load names
    factory_names = get_factory_names()
    field_names = get_field_names()
    
    # Process each district council
    for council_name in list(data.keys()):
        if "Conselho Popular Distrital de Industrial" in council_name:
            # Create a new factory committee
            committee_base = f"Comitê de Fábrica {random.choice(factory_names)}"
            committee_name = committee_base
            
            # Add Roman numerals if committee already exists
            i = 1
            while committee_name in data:
                i += 1
                committee_name = f"{committee_base} {to_roman(i)}"
            
            # Create new factory committee
            new_committee_data = copy.deepcopy(template_factory)
            new_committee_data["conselhoPopularAssociadoDeComiteOuTrabalhador"] = council_name
            
            # Add committee to data
            data[committee_name] = new_committee_data
            print(f"Created committee: {committee_name} associated with {council_name}")
            
            # Create associated user
            full_name = f"User {committee_name}"
            base_username = full_name.split()[0].lower()
            username = generate_unique_username(base_username, data["users"])
            
            new_user = {
                "username": username,
                "password": "123",
                "name": full_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Comitê de Fábrica",
                "preposition": "de",
                "jurisdiction": committee_name,
                "instancePrepositionJurisdictionUUID": committee_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for committee: {committee_name}")
        
        elif "Conselho Popular Distrital do Campo" in council_name:
            # Create a new field committee
            committee_base = f"Comitê do Campo {random.choice(field_names)}"
            committee_name = committee_base
            
            # Add Roman numerals if committee already exists
            i = 1
            while committee_name in data:
                i += 1
                committee_name = f"{committee_base} {to_roman(i)}"
            
            # Create new field committee
            new_committee_data = copy.deepcopy(template_field)
            new_committee_data["conselhoPopularAssociadoDeComiteOuTrabalhador"] = council_name
            
            # Add committee to data
            data[committee_name] = new_committee_data
            print(f"Created committee: {committee_name} associated with {council_name}")
            
            # Create associated user
            full_name = f"User {committee_name}"
            base_username = full_name.split()[0].lower()
            username = generate_unique_username(base_username, data["users"])
            
            new_user = {
                "username": username,
                "password": "123",
                "name": full_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Comitê do Campo",
                "preposition": "de",
                "jurisdiction": committee_name,
                "instancePrepositionJurisdictionUUID": committee_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for committee: {committee_name}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Factory and field committees creation completed!")

if __name__ == "__main__":
    create_comites()