import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "Cazaquistão": {
            "do Centro do Cazaquistão": ["Almaty", "Nur-Sultan"],
            "do Leste do Cazaquistão": ["Shymkent", "Karagandy"],
            "do Norte do Cazaquistão": ["Oskemen", "Pavlodar"],
            "do Oeste do Cazaquistão": ["Aktobe", "Ust-Kamenogorsk"],
            "do Sul do Cazaquistão": ["Kyzylorda", "Taraz"]
        },
        "Uzbequistão": {
            "da Região Central do Uzbequistão": ["Tashkent", "Samarkand"],
            "da Região Meridional do Uzbequistão": ["Bukhara", "Khiva"],
            "da Região Ocidental do Uzbequistão": ["Urgench", "Khazar"],
            "da Região Oriental do Uzbequistão": ["Fergana", "Andijan"]
        },
        "Arábia Saudita": {
            "da Região Central da Arábia Saudita": ["Riyadh", "Qassim"],
            "da Região Leste da Arábia Saudita": ["Dammam", "Al-Ahsa"],
            "da Região Oeste da Arábia Saudita": ["Makkah", "Jeddah"],
            "da Região Sul da Arábia Saudita": ["Asir", "Najran"]
        },
        "Turquia": {
            "da Região da Anatólia Central do Turquia": ["Ankara", "Konya"],
            "da Região da Anatólia Oriental do Turquia": ["Erzurum", "Van"],
            "da Região de Mármara do Turquia": ["Istanbul", "Bursa"],
            "da Região do Egeu do Turquia": ["Izmir", "Aydın"],
            "da Região do Mar Negro do Turquia": ["Trabzon", "Rize"],
            "da Região do Mediterrâneo do Turquia": ["Antalya", "Mersin"],
            "da Região do Sudeste da Anatólia do Turquia": ["Gaziantep", "Adana"]
        }
    }

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "Cazaquistão": {
            "first": ["Nursultan", "Aida", "Yerlan", "Dana"],
            "last": ["Nazarbayev", "Akhmetova", "Tasmagambetov", "Baisalov"]
        },
        "Uzbequistão": {
            "first": ["Islom", "Gulnara", "Shavkat", "Dilbar"],
            "last": ["Karimov", "Mirziyoyev", "Niyazov", "Yuldashev"]
        },
        "Arábia Saudita": {
            "first": ["Mohammed", "Fatimah", "Abdullah", "Aisha"],
            "last": ["Al Saud", "Al Faisal", "Al Rashid", "Al Ghamdi"]
        },
        "Turquia": {
            "first": ["Recep", "Emine", "Kemal", "Ayşe"],
            "last": ["Erdoğan", "İnce", "Yıldırım", "Kılıçdaroğlu"]
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
            
            if regional_council not in data:
                # Create new regional council if it doesn't exist
                new_regional_council = copy.deepcopy(template_council)
                new_regional_council["conselhoPopularAssociadoDeConselhoPopular"] = f"Conselho Popular Nacional do {country}"
                data[regional_council] = new_regional_council
                print(f"Created regional council: {regional_council} associated with Conselho Popular Nacional do {country}")
                
                # Create associated user for regional council
                country_names = names_by_country.get(country, names_by_country["DEFAULT"])
                full_name = f"{random.choice(country_names['first'])} {random.choice(country_names['last'])}"
                base_username = full_name.split()[0].lower()
                username = generate_unique_username(base_username, data["users"])
                
                new_user = {
                    "username": username,
                    "password": "123",
                    "name": full_name,
                    "pronoun": random.choice(["masculino", "feminino"]),
                    "instance": "Conselho Popular Regional Nacional",
                    "preposition": "do",
                    "jurisdiction": f"{region} do {country}",
                    "instancePrepositionJurisdictionUUID": regional_council
                }
                
                data["users"].append(new_user)
                print(f"Created user: {username} for regional council: {regional_council}")
            
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