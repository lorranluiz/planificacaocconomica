import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "China": {
            "first": ["Wei", "Jing", "Li", "Hua"],
            "last": ["Wang", "Li", "Zhang", "Liu"]
        },
        "Coreia do Sul": {
            "first": ["Jin", "Min", "Seo", "Ji"],
            "last": ["Kim", "Lee", "Park", "Choi"]
        },
        "Indonésia": {
            "first": ["Agus", "Dewi", "Budi", "Siti"],
            "last": ["Sutanto", "Wijaya", "Santoso", "Prasetyo"]
        },
        "Vietnã": {
            "first": ["Nguyen", "Tran", "Le", "Pham"],
            "last": ["Nguyen", "Tran", "Le", "Pham"]
        },
        "Índia": {
            "first": ["Amit", "Priya", "Raj", "Anita"],
            "last": ["Sharma", "Patel", "Singh", "Kumar"]
        },
        "Paquistão": {
            "first": ["Ali", "Fatima", "Ahmed", "Ayesha"],
            "last": ["Khan", "Malik", "Butt", "Chaudhry"]
        },
        "DEFAULT": {
            "first": ["DefaultFirstName"],
            "last": ["DefaultLastName"]
        }
    }

def generate_unique_username(base_username, users):
    """Generates a unique username by appending a number if necessary"""
    usernames = {user["username"] for user in users}
    if base_username not in usernames:
        return base_username
    
    i = 1
    while f"{base_username}{i}" in usernames:
        i += 1
    return f"{base_username}{i}"

def create_regional_state_councils():
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
    
    # Get template
    template_council = data.get("Conselho Popular Regional Estadual da Região Serrana do Rio de Janeiro", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load names dictionary
    names_by_country = get_names_by_country()
    
    # Process each state council
    for council_name in list(data.keys()):
        if "Conselho Popular Estadual" in council_name and council_name not in ["Conselho Popular Estadual do Rio de Janeiro", "Conselho Popular Estadual do Amazonas"]:
            state = council_name.split(" ")[-1]
            state_article = get_article_for_state(state)
            
            # Create two new regional state councils
            new_councils = [
                f"Conselho Popular Regional Estadual da Região Metropolitana {state_article} {state}",
                f"Conselho Popular Regional Estadual do Interior {state_article} {state}"
            ]
            
            for new_council in new_councils:
                if new_council in data:
                    print(f"Council {new_council} already exists, skipping...")
                    continue
                
                # Create new regional state council
                new_council_data = copy.deepcopy(template_council)
                new_council_data["conselhoPopularAssociadoDeConselhoPopular"] = council_name
                
                # Add council to data
                data[new_council] = new_council_data
                print(f"Created council: {new_council} associated with {council_name}")
                
                # Create associated user
                country = "DEFAULT"  # Adjust this if you have country-specific logic
                country_names = names_by_country.get(country, names_by_country["DEFAULT"])
                full_name = f"{random.choice(country_names['first'])} {random.choice(country_names['last'])}"
                base_username = full_name.split()[0].lower()
                username = generate_unique_username(base_username, data["users"])
                
                new_user = {
                    "username": username,
                    "password": "123",
                    "name": full_name,
                    "pronoun": random.choice(["masculino", "feminino"]),
                    "instance": "Conselho Popular Regional Estadual",
                    "preposition": state_article,
                    "jurisdiction": f"{state_article} {state}",
                    "instancePrepositionJurisdictionUUID": new_council
                }
                
                data["users"].append(new_user)
                print(f"Created user: {username} for council: {new_council}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Regional state councils creation completed!")

if __name__ == "__main__":
    create_regional_state_councils()