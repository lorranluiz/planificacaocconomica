import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "Colômbia": {
            "Região Amazônica da Colômbia": ["Amazonas", "Caquetá"],
            "Região Andina da Colômbia": ["Antioquia", "Boyacá"],
            "Região Caribe da Colômbia": ["Atlántico", "Cesar"],
            "Região Insular da Colômbia": ["Archipiélago de San Andrés, Providencia y Santa Catalina"],
            "Região Orinoquía (Llanos Orientales) da Colômbia": ["Meta", "Vichada"],
            "Região Pacífica da Colômbia": ["Chocó", "Valle del Cauca"]
        },
        "Peru": {
            "da Costa do Peru": ["Lima", "Ancash"],
            "da Selva do Peru": ["Amazonas", "Ucayali"],
            "da Sierra do Peru": ["Cusco", "Puno"]
        },
        "Argentina": {
            "da Cuyo da Argentina": ["Mendoza", "San Juan"],
            "da Patagônia da Argentina": ["Río Negro", "Chubut"],
            "do Centro da Argentina": ["Buenos Aires", "Córdoba"],
            "do Nordeste da Argentina": ["Corrientes", "Entre Ríos"],
            "do Noroeste da Argentina": ["Salta", "Jujuy"]
        },
        "Paraguai": {
            "da Região Ocidental do Paraguai": ["Alto Paraguay", "Boquerón"],
            "da Região Oriental do Paraguai": ["Asunción", "Central"]
        },
        "Guiana": {
            "da Região Leste do Guiana": ["East Berbice-Corentyne", "Mahaica-Berbice"],
            "da Região Oeste do Guiana": ["Pomeroon-Supenaam", "Waini"]
        },
        "Suriname": {
            "do Norte do Suriname": ["Sipaliwini", "Brokopondo"],
            "do Sul do Suriname": ["Paramaribo"]
        }
    }

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "Colômbia": {
            "first": ["Juan", "Carlos", "Maria", "Ana"],
            "last": ["González", "Rodríguez", "Martínez", "García"]
        },
        "Peru": {
            "first": ["José", "Luis", "Carmen", "Rosa"],
            "last": ["Fernández", "Gómez", "Díaz", "Torres"]
        },
        "Argentina": {
            "first": ["Santiago", "Mateo", "Sofía", "Valentina"],
            "last": ["Pérez", "López", "Romero", "Sánchez"]
        },
        "Paraguai": {
            "first": ["Miguel", "Javier", "Lucía", "Camila"],
            "last": ["Benítez", "Giménez", "Vera", "Rojas"]
        },
        "Guiana": {
            "first": ["Ryan", "Kevin", "Alicia", "Natasha"],
            "last": ["Singh", "Persaud", "Mohamed", "Ali"]
        },
        "Suriname": {
            "first": ["Rajesh", "Vishal", "Sunita", "Anjali"],
            "last": ["Jankie", "Biharie", "Kanhai", "Ramlal"]
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
    
    # Get template
    template_council = data.get("Conselho Popular Estadual do Rio de Janeiro", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load names dictionary
    names_by_country = get_names_by_country()
    
    # Process each regional council
    for country, regions in state_names_by_region.items():
        for region, states in regions.items():
            regional_council = f"Conselho Popular Regional Nacional {region}"
            
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
                country_names = names_by_country.get(country, names_by_country["DEFAULT"])
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
                    "jurisdiction": f"{state} {state_article} {country}",
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