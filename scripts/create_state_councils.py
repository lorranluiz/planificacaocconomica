import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "Costa Rica": {
            "Caribe": ["Limón", "Puntarenas"],
            "Central": ["San José", "Alajuela"],
            "Pacífico": ["Guanacaste", "Puntarenas"]
        },
        "Guatemala": {
            "Central": ["Sacatepéquez", "Chimaltenango"],
            "Metropolitana": ["Guatemala", "Villa Nueva"],
            "Nordeste": ["Izabal", "Chiquimula"],
            "Noroeste": ["Huehuetenango", "Quiché"],
            "Norte": ["Petén", "Alta Verapaz"],
            "Petén": ["Petén"],
            "Sudeste": ["Jutiapa", "Santa Rosa"],
            "Sudoeste": ["Retalhuleu", "Quetzaltenango"]
        },
        "República Dominicana": {
            "Leste": ["La Altagracia", "El Seibo"],
            "Norte (Cibao)": ["Santiago", "La Vega"],
            "Sul": ["Santo Domingo", "San Cristóbal"]
        },
        "Cuba": {
            "Central": ["Villa Clara", "Cienfuegos"],
            "Ocidental": ["Pinar del Río", "Havana"],
            "Oriental": ["Holguín", "Camagüey"]
        }
    }

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "Costa Rica": {
            "first": ["Juan", "Carlos", "Ana", "Maria"],
            "last": ["Gonzalez", "Rodriguez", "Perez", "Sanchez"]
        },
        "Guatemala": {
            "first": ["Jose", "Luis", "Carmen", "Sofia"],
            "last": ["Lopez", "Martinez", "Garcia", "Hernandez"]
        },
        "República Dominicana": {
            "first": ["Pedro", "Miguel", "Laura", "Isabel"],
            "last": ["Fernandez", "Diaz", "Ramirez", "Torres"]
        },
        "Cuba": {
            "first": ["Raul", "Jorge", "Elena", "Rosa"],
            "last": ["Castro", "Gomez", "Vazquez", "Mendez"]
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

def create_state_councils():
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
    
    # Get state names by region
    state_names_by_region = get_state_names_by_region()
    
    # Find regional councils
    regional_councils = [
        council_name for council_name in data.keys()
        if council_name.startswith("Conselho Popular Regional Nacional") and
        "Norte do Brasil" not in council_name and
        "Sudeste do Brasil" not in council_name
    ]
    
    # Get template
    template_council = data.get("Conselho Popular Estadual do Rio de Janeiro", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load names dictionary
    names_by_country = get_names_by_country()
    
    # Process each regional council
    for regional_council in regional_councils:
        # Extract country and region name
        parts = regional_council.split()
        country_name = parts[-1]
        region_name = parts[-3]
        
        # Adjust extraction logic for specific cases
        if country_name == "Rica":
            country_name = "Costa Rica"
            region_name = parts[-4]
        elif country_name == "Dominicana":
            country_name = "República Dominicana"
            region_name = parts[-4]
        
        print(f"Processing regional council: {regional_council} (Country: {country_name}, Region: {region_name})")
        
        if country_name not in state_names_by_region:
            print(f"Country {country_name} not found in state names by region, skipping...")
            continue
        
        states = state_names_by_region[country_name].get(region_name, [])
        
        if not states:
            print(f"No states found for region {region_name} in country {country_name}, skipping...")
            continue
        
        for state in states:
            state_article = get_article_for_state(state)
            council_name = f"Conselho Popular Estadual {state_article} {state}"
            
            if council_name in data:
                print(f"Council {council_name} already exists, skipping...")
                continue
            
            # Create new state council
            new_council = copy.deepcopy(template_council)
            new_council["conselhoPopularAssociadoDeConselhoPopular"] = regional_council
            
            # Add council to data
            data[council_name] = new_council
            print(f"Created council: {council_name} associated with {regional_council}")
            
            # Create associated user
            country_names = names_by_country.get(country_name, names_by_country["DEFAULT"])
            full_name = f"{random.choice(country_names['first'])} {random.choice(country_names['last'])}"
            base_username = full_name.split()[0].lower()
            username = generate_unique_username(base_username, data["users"])
            
            new_user = {
                "username": username,
                "password": "123",
                "name": full_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Conselho Popular Estadual",
                "preposition": state_article,
                "jurisdiction": f"{state} {state_article} {country_name}",
                "instancePrepositionJurisdictionUUID": council_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for council: {council_name}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("State councils creation completed!")

if __name__ == "__main__":
    create_state_councils()