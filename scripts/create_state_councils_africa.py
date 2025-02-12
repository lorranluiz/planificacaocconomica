import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "Namíbia": {
            "da Região de Erongo": ["Omaruru", "Tsumeb"],
            "da Região de Kavango Oriental": ["Mavinga", "Mbeya"],
            "da Região de Khomas": ["Windhoek", "Okahandja"],
            "da Região de Oshana": ["Oshakati", "Onandjokwe"],
            "da Região de Otjozondjupa": ["Otjiwarongo", "Gobabis"]
        },
        "África do Sul": {
            "do Leste da África do Sul": ["Mpumalanga", "Gauteng"],
            "do Norte da África do Sul": ["Limpopo", "North West"],
            "do Oeste da África do Sul": ["Western Cape", "Northern Cape"],
            "do Sul da África do Sul": ["Eastern Cape", "Western Cape"],
            "do Sudeste da África do Sul": ["Mpumalanga", "Gauteng"],
            "do Sudoeste da África do Sul": ["Western Cape", "Northern Cape"]
        },
        "Chade": {
            "da Região de Borkou": ["Fada", "Baga Sola"],
            "da Região de Chari-Baguirmi": ["N'Djamena", "Moundou"],
            "da Região de Logone Ocidental": ["Kousséri", "Ati"],
            "da Região de N'Djamena": ["N'Djamena", "Moundou"],
            "da Região de Ouaddaï": ["Abéché", "Am Dam"]
        },
        "República Democrática do Congo": {
            "do Norte da DRC": ["Province du Nord-Kivu", "Province de l'Upper-Congo"],
            "do Sul da DRC": ["Province du Sud-Kivu", "Province du Maniema"],
            "do Leste da DRC": ["Province du Nord-Kivu", "Province du Sud-Kivu"],
            "do Oeste da DRC": ["Province du Bandundu", "Province du Bas-Congo"],
            "do Central da DRC": ["Province du Kasaï-Oriental", "Province du Kasaï-Occidental"]
        },
        "Nigéria": {
            "do Leste da Nigéria": ["Anambra", "Enugu"],
            "do Norte da Nigéria": ["Kano", "Kaduna"],
            "do Oeste da Nigéria": ["Lagos", "Oyo"],
            "do Sul da Nigéria": ["Rivers", "Bayelsa"]
        },
        "Gana": {
            "do Leste do Gana": ["Eastern Region", "Ashanti Region"],
            "do Norte do Gana": ["Upper East Region", "Upper West Region"],
            "do Oeste do Gana": ["Western Region", "Volta Region"],
            "do Sul do Gana": ["Greater Accra Region", "Central Region"]
        },
        "Tanzânia": {
            "da Costa da Tanzânia": ["Pwani Region", "Mtwara Region"],
            "do Centro da Tanzânia": ["Dodoma Region", "Singida Region"],
            "do Norte da Tanzânia": ["Kilimanjaro Region", "Tanga Region"],
            "do Oeste da Tanzânia": ["Shinyanga Region", "Mwanza Region"],
            "do Sul da Tanzânia": ["Ruvuma Region", "Lindi Region"]
        },
        "Quênia": {
            "do Leste do Quênia": ["Machakos County", "Kitui County"],
            "do Norte do Quênia": ["Mandera County", "Wajir County"],
            "do Oeste do Quênia": ["Kisumu County", "Nakuru County"],
            "do Sul do Quênia": ["Kiambu County", "Murang'a County"]
        },
        "Argélia": {
            "do Centro da Argélia": ["Alger", "Tizi Ouzou"],
            "do Leste da Argélia": ["Constantine", "Setif"],
            "do Norte da Argélia": ["Oran", "Mostaganem"],
            "do Oeste da Argélia": ["Tlemcen", "Sidi Bel Abbès"],
            "do Sul da Argélia": ["Ghardaia", "El Oued"]
        },
        "Egito": {
            "da Península do Sinai do Egito": ["North Sinai Governorate", "South Sinai Governorate"],
            "do Delta do Nilo do Egito": ["Cairo Governorate", "Giza Governorate"],
            "do Deserto Ocidental do Egito": ["Matruh Governorate", "New Valley Governorate"],
            "do Deserto Oriental do Egito": ["Red Sea Governorate", "South Sinai Governorate"],
            "do Vale do Nilo do Egito": ["Aswan Governorate", "Luxor Governorate"]
        }
    }

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "Namíbia": {
            "first": ["John", "Maria", "Peter", "Anna"],
            "last": ["Smith", "Johnson", "Williams", "Brown"]
        },
        "África do Sul": {
            "first": ["Thabo", "Nelson", "Winnie", "Desmond"],
            "last": ["Mbeki", "Mandela", "Madikizela", "Tutu"]
        },
        "Chade": {
            "first": ["Ahmad", "Fatima", "Ali", "Amina"],
            "last": ["Hassan", "Mahamat", "Abakar", "Youssouf"]
        },
        "República Democrática do Congo": {
            "first": ["Jean", "Marie", "Joseph", "Anne"],
            "last": ["Kabila", "Lumumba", "Mobutu", "Tshisekedi"]
        },
        "Nigéria": {
            "first": ["Chinua", "Ngozi", "Wole", "Chimamanda"],
            "last": ["Achebe", "Adichie", "Soyinka", "Okonkwo"]
        },
        "Gana": {
            "first": ["Kwame", "Ama", "Kofi", "Akosua"],
            "last": ["Nkrumah", "Mensah", "Boateng", "Owusu"]
        },
        "Tanzânia": {
            "first": ["Julius", "Nyerere", "Magufuli", "Hassan"],
            "last": ["Kikwete", "Mwinyi", "Mkapa", "Mwinyi"]
        },
        "Quênia": {
            "first": ["Jomo", "Uhuru", "Raila", "Martha"],
            "last": ["Kenyatta", "Odinga", "Karua", "Ruto"]
        },
        "Argélia": {
            "first": ["Abdelaziz", "Ahmed", "Fatima", "Amina"],
            "last": ["Bouteflika", "Ben Bella", "Boumediene", "Bendjedid"]
        },
        "Egito": {
            "first": ["Mohamed", "Ahmed", "Fatima", "Amina"],
            "last": ["El-Sisi", "Mubarak", "Sadat", "Nasser"]
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