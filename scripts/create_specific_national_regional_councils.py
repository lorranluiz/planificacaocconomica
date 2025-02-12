import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_specific_country_regions(country_name):
    """Returns regions for specific countries"""
    regions = {
        "Costa Rica": ["Pacífico", "Central", "Caribe"],
        "Guatemala": [
            "Região Metropolitana", "Região Norte", "Região Nordeste",
            "Região Sudeste", "Região Central", "Região Sudoeste",
            "Região Noroeste", "Região Petén"
        ],
        "República Dominicana": [
            "Região Norte (Cibao)", "Região Sul", "Região Leste"
        ],
        "Cuba": ["Região Ocidental", "Região Central", "Região Oriental"],
        "Canadá": [
            "Atlântico", "Quebec", "Ontário", "Pradarias",
            "Pacífico", "Territórios do Norte"
        ],
        "México": [
            "Noroeste", "Norte", "Nordeste", "Centro-Norte",
            "Centro-Sul", "Ocidente", "Leste", "Sul-Sudeste"
        ],
        "Estados Unidos": [
            "Noroeste", "Oeste", "Centro-Oeste (Midwest)", 
            "Sul", "Nordeste"
        ],
        "Colômbia": [
            "Região Andina", "Região Caribe", "Região Pacífica",
            "Região Amazônica", "Região Orinoquía (Llanos Orientales)",
            "Região Insular"
        ]
    }
    return regions.get(country_name, [])

def get_names_by_country():
    """Returns a dictionary of names by country"""
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
        "Canadá": {
            "first": ["John", "Michael", "Emily", "Sarah"],
            "last": ["Smith", "Brown", "Wilson", "Taylor"]
        },
        "México": {
            "first": ["Luis", "Javier", "Gabriela", "Fernanda"],
            "last": ["Hernandez", "Lopez", "Martinez", "Gonzalez"]
        },
        "Estados Unidos": {
            "first": ["James", "Robert", "Patricia", "Jennifer"],
            "last": ["Johnson", "Williams", "Jones", "Brown"]
        },
        "Colômbia": {
            "first": ["Carlos", "Andres", "Diana", "Paola"],
            "last": ["Gomez", "Rodriguez", "Martinez", "Garcia"]
        },
        "DEFAULT": {
            "first": ["DefaultFirstName"],
            "last": ["DefaultLastName"]
        }
    }

def get_region_name_with_article(region, country_name):
    """Returns the region name with the appropriate article"""
    articles = {
        "Costa Rica": "da",
        "Guatemala": "da",
        "República Dominicana": "da",
        "Cuba": "da",
        "Canadá": "do",
        "México": "do",
        "Estados Unidos": "dos",
        "Colômbia": "da"
    }
    country_article = articles.get(country_name, "do")
    return {
        "full_name": f"{region} {country_article} {country_name}",
        "region_article": "do" if region.startswith(("A", "E", "I", "O", "U")) else "da",
        "country_article": country_article
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

def create_specific_national_regional_councils():
    """Create regional councils for specific countries only"""
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
    
    # List of specific countries to process
    specific_countries = [
        "Costa Rica", "Guatemala", "República Dominicana", "Cuba",
        "Canadá", "México", "Estados Unidos", "Colômbia"
    ]
    
    # Find national councils for specific countries
    national_councils = [
        council_name for council_name in data.keys()
        if council_name.startswith("Conselho Popular Nacional") and
        any(country in council_name for country in specific_countries)
    ]
    
    # Get template
    template_council = data.get("Conselho Popular Regional Nacional do Sudeste do Brasil", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load names dictionary
    names_by_country = get_names_by_country()
    
    # Process each national council
    for national_council in national_councils:
        # Extract country name
        country_name = None
        for country in specific_countries:
            if country in national_council:
                country_name = country
                break
                
        if not country_name:
            continue
            
        # Get regions for this country
        regions = get_specific_country_regions(country_name)
        
        for region in regions:
            name_parts = get_region_name_with_article(region, country_name)
            council_name = f"Conselho Popular Regional Nacional {name_parts['full_name']}"
            
            if council_name in data:
                print(f"Council {council_name} already exists, skipping...")
                continue
            
            # Create new regional council
            new_council = copy.deepcopy(template_council)
            new_council["conselhoPopularAssociadoDeConselhoPopular"] = national_council
            
            # Add council to data
            data[council_name] = new_council
            print(f"Created council: {council_name}")
            
            # Create associated user
            country_names = names_by_country.get(country_name)
            if not country_names:
                print(f"Warning: No names found for country {country_name}, using defaults")
                country_names = names_by_country["DEFAULT"]
            
            full_name = f"{random.choice(country_names['first'])} {random.choice(country_names['last'])}"
            base_username = full_name.split()[0].lower()
            username = generate_unique_username(base_username, data["users"])
            
            new_user = {
                "username": username,
                "password": "123",
                "name": full_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Conselho Popular Regional Nacional",
                "preposition": name_parts['region_article'],
                "jurisdiction": f"{region} {name_parts['country_article']} {country_name}",
                "instancePrepositionJurisdictionUUID": council_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for council: {council_name}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Specific national regional councils creation completed!")

if __name__ == "__main__":
    create_specific_national_regional_councils()