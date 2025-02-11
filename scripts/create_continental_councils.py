import json
import os
from datetime import datetime
import shutil
import copy
import random

def generate_creative_name(continent):
    """Generate names characteristic of each continent"""
    continent_names = {
        "África": {
            "first": ["Amara", "Zola", "Kwame", "Mandla", "Thabo", "Amina", 
                     "Chioma", "Folami", "Kenzo", "Zalika"],
            "last": ["Mensah", "Okafor", "Mandela", "Keita", "Diallo", 
                    "Okonjo", "Mbeki", "Toure", "Kamara", "Adebayo"]
        },
        "América do Norte": {
            "first": ["John", "Michael", "William", "James", "Emma", 
                     "Olivia", "Isabella", "Sophia", "Lucas", "Mason"],
            "last": ["Smith", "Johnson", "Williams", "Brown", "Jones", 
                    "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
        },
        "América Central e Caribe": {
            "first": ["Carlos", "Miguel", "José", "Juan", "Luis", 
                     "María", "Ana", "Carmen", "Rosa", "Elena"],
            "last": ["García", "Rodríguez", "Hernández", "Martinez", "López", 
                    "González", "Pérez", "Ramírez", "Torres", "Flores"]
        },
        "Ásia": {
            "first": ["Wei", "Li", "Ming", "Hiroshi", "Yuki", "Jin", 
                     "Raj", "Priya", "Ahmad", "Fatima"],
            "last": ["Zhang", "Wang", "Chen", "Tanaka", "Kim", "Singh", 
                    "Patel", "Kumar", "Ali", "Khan"]
        },
        "Europa": {
            "first": ["Hans", "Pierre", "Giuseppe", "Sofia", "Anna", 
                     "Klaus", "Elena", "Marco", "Lukas", "Maria"],
            "last": ["Mueller", "Bernard", "Schmidt", "Rossi", "Kowalski", 
                    "Anderson", "Silva", "Nielsen", "Garcia", "Ivanov"]
        },
        "Oceania": {
            "first": ["Jack", "Oliver", "Noah", "William", "Charlotte", 
                     "Mia", "Aroha", "Kiri", "Tane", "Marama"],
            "last": ["Smith", "Wilson", "Williams", "Anderson", "Thompson",
                    "Hohepa", "Walker", "Ryan", "Robinson", "Taylor"]
        },
        "Antártida": {
            "first": ["Scott", "Ernest", "Robert", "Edmund", "Roald", 
                     "James", "Douglas", "Frank", "Charles", "Lawrence"],
            "last": ["Shackleton", "Amundsen", "Byrd", "Scott", "Mawson",
                    "Ross", "Wild", "Worsley", "Wilson", "Oates"]
        }
    }

    names = continent_names.get(continent, {
        "first": ["Default", "Test"],
        "last": ["Name", "User"]
    })
    
    return f"{random.choice(names['first'])} {random.choice(names['last'])}"

def generate_unique_username(base, users):
    username = base.lower()
    candidate = username
    counter = 1
    existing = {user.get("username", "") for user in users}
    while candidate in existing:
        candidate = f"{username}{counter}"
        counter += 1
    return candidate

def get_continent_name_with_article(continent):
    """Returns proper name with article based on continent gender/number"""
    continent_formats = {
        "África": "da África",
        "América do Norte": "da América do Norte",
        "América Central e Caribe": "da América Central e Caribe",
        "Ásia": "da Ásia",
        "Europa": "da Europa",
        "Oceania": "da Oceania",
        "Antártida": "da Antártida"
    }
    return continent_formats.get(continent, continent)

def create_continental_councils():
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
        
    # Ensure users list exists
    if "users" not in data:
        data["users"] = []
        
    # Get South America council as template
    template_council = data.get("Conselho Popular Continental da América do Sul", {})
    
    if not template_council:
        print("Template council not found!")
        return
        
    # List of continents to create (excluding South America)
    continents = [
        "África",
        "América do Norte",
        "América Central e Caribe",  # Added Central America and Caribbean
        "Ásia", 
        "Europa",
        "Oceania",
        "Antártida"
    ]
    
    # Create backup
    shutil.copy2(data_path, backup_path)
    
    # Create councils for each continent
    for continent in continents:
        continent_with_article = get_continent_name_with_article(continent)
        council_name = f"Conselho Popular Continental {continent_with_article}"
        
        # Skip if council already exists
        if council_name in data:
            print(f"Council {council_name} already exists, skipping...")
            continue
            
        # Create new council from template
        new_council = copy.deepcopy(template_council)
        
        # Set association to Intercontinental Council
        new_council["conselhoPopularAssociadoDeConselhoPopular"] = "Conselho Popular Intercontinental da Terra"
        new_council["conselhoPopularAssociadoDeComiteOuTrabalhador"] = ""
        
        # Add to data
        data[council_name] = new_council
        print(f"Created council: {council_name}")
        
        # Create associated user
        full_name = generate_creative_name(continent)  # Pass continent here
        base_username = full_name.split()[0].lower()
        username = generate_unique_username(base_username, data["users"])
        
        new_user = {
            "username": username,
            "password": "123",
            "name": full_name,
            "pronoun": random.choice(["masculino", "feminino"]),
            "instance": "Conselho Popular Continental",
            "preposition": continent_with_article.split()[0],  # "da", "do", etc
            "jurisdiction": " ".join(continent_with_article.split()[1:]),  # Rest of the name
            "instancePrepositionJurisdictionUUID": council_name
        }
        
        data["users"].append(new_user)
        print(f"Created user: {username} for council: {council_name}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Continental councils and users creation completed!")

if __name__ == "__main__":
    create_continental_councils()