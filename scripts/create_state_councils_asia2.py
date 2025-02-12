import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "China": {
            "da Cidade Administrativas da China": ["Beijing", "Shanghai"],
            "das Províncias da China": ["Guangdong", "Jiangsu"],
            "das Regiões Autônomas da China": ["Xinjiang", "Tibet"],
            "das Zonas Administrativas Especiais da China": ["Hong Kong", "Macau"]
        },
        "Coreia do Sul": {
            "do Norte da Coreia do Sul": ["Gyeonggi-do", "Gangwon-do"],
            "do Sul da Coreia do Sul": ["Gyeongsangnam-do", "Jeollanam-do"],
            "do Sudeste da Coreia do Sul": ["Busan", "Ulsan"],
            "Central da Coreia do Sul": ["Chungcheongbuk-do", "Chungcheongnam-do"],
            "do Oeste da Coreia do Sul": ["Incheon", "Gwangju"],
            "do Leste da Coreia do Sul": ["Daegu", "Daejeon"]
        },
        "Indonésia": {
            "da Kalimantan da Indonésia": ["Kalimantan Barat", "Kalimantan Tengah"],
            "da Molucas da Indonésia": ["Maluku", "Maluku Utara"],
            "da Papua da Indonésia": ["Papua", "Papua Barat"],
            "da Região de Java": ["Jawa Barat", "Jawa Tengah"],
            "da Sumatra da Indonésia": ["Sumatera Utara", "Sumatera Selatan"],
            "das Ilhas menores da Sonda da Indonésia": ["Nusa Tenggara Timur", "Nusa Tenggara Barat"],
            "do Sulawesi da Indonésia": ["Sulawesi Utara", "Sulawesi Tengah"]
        },
        "Vietnã": {
            "do Costa Central do Norte do Vietnã": ["Ha Long", "Quang Ninh"],
            "do Costa Central do Sul do Vietnã": ["Da Nang", "Quang Nam"],
            "do Delta do Mekong do Vietnã": ["Ho Chi Minh City", "Dong Thap"],
            "do Delta do Rio Vermelho do Vietnã": ["Hanoi", "Haiphong"],
            "do Nordeste do Vietnã": ["Thai Nguyen", "Vinh Phuc"],
            "do Noroeste do Vietnã": ["Lao Cai", "Yen Bai"],
            "do Sudeste do Vietnã": ["Khanh Hoa", "Ninh Thuan"],
            "dos Planaltos Centrais do Vietnã": ["Thanh Hoa", "Nam Dinh"]
        },
        "Índia": {
            "do Centro-Oeste da Índia": ["Madhya Pradesh", "Chhattisgarh"],
            "do Leste da Índia": ["West Bengal", "Odisha"],
            "do Nordeste da Índia": ["Assam", "Mizoram"],
            "do Norte da Índia": ["Uttar Pradesh", "Uttarakhand"],
            "do Oeste da Índia": ["Maharashtra", "Gujarat"],
            "do Sul da Índia": ["Karnataka", "Kerala"]
        },
        "Paquistão": {
            "do Leste do Paquistão": ["Punjab", "Sindh"],
            "do Norte do Paquistão": ["Khyber Pakhtunkhwa", "Gilgit-Baltistan"],
            "do Oeste do Paquistão": ["Balochistan", "Azad Jammu and Kashmir"],
            "do Sul do Paquistão": ["Karachi", "Hyderabad"]
        }
    }

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