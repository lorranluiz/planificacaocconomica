import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_state_names_by_region():
    return {
        "Itália": {
            "das Ilhas da Itália": ["Sicília", "Sardenha"],
            "do Centro da Itália": ["Toscana", "Umbria"],
            "do Norte da Itália": ["Lombardia", "Veneto"],
            "do Sul da Itália": ["Campania", "Puglia"]
        },
        "Espanha": {
            "do Leste da Espanha": ["Catalunha", "Valência"],
            "do Norte da Espanha": ["País Basco", "Astúrias"],
            "do Oeste da Espanha": ["Galícia", "Extremadura"],
            "do Sul da Espanha": ["Andaluzia", "Murcia"]
        },
        "Bélgica": {
            "da Bruxelas-Capital da Bélgica": ["Bruxelas"],
            "da Flandres da Bélgica": ["West Flanders", "East Flanders"],
            "da Valônia da Bélgica": ["Wallonia"]
        },
        "França": {
            "do Leste da França": ["Alsace", "Lorraine"],
            "do Norte da França": ["Nord", "Pas-de-Calais"],
            "do Oeste da França": ["Bretagne", "Pays de la Loire"],
            "do Sul da França": ["Provence-Alpes-Côte d'Azur", "Languedoc-Roussillon"]
        },
        "Romênia": {
            "do Leste da Romênia": ["Transilvânia", "Moldávia"],
            "do Norte da Romênia": ["Crișana", "Maramureș"],
            "do Oeste da Romênia": ["Banat", "Oltenia"],
            "do Sul da Romênia": ["Dobruja", "Muntenia"]
        },
        "Ucrânia": {
            "do Leste do Ucrânia": ["Donbass", "Luhansk"],
            "do Norte do Ucrânia": ["Polissia", "Volínia"],
            "do Oeste do Ucrânia": ["Carpathian Ruthenia", "Galícia"],
            "do Sul do Ucrânia": ["Odessa", "Mykolaiv"]
        },
        "Finlândia": {
            "do Leste do Finlândia": ["Kainuu", "North Karelia"],
            "do Norte do Finlândia": ["Lapland", "North Ostrobothnia"],
            "do Oeste do Finlândia": ["Pirkanmaa", "Western Finland"],
            "do Sul do Finlândia": ["Southern Finland", "Uusimaa"]
        },
        "Suécia": {
            "do Centro do Suécia": ["Gävleborg", "Västmanland"],
            "do Norte do Suécia": ["Norrbotten", "Västerbotten"],
            "do Sul do Suécia": ["Skåne", "Västra Götaland"]
        }
    }

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def get_names_by_country():
    return {
        "Itália": {
            "first": ["Giovanni", "Luca", "Francesca", "Giulia"],
            "last": ["Rossi", "Russo", "Ferrari", "Esposito"]
        },
        "Espanha": {
            "first": ["José", "Luis", "Carmen", "Rosa"],
            "last": ["Fernández", "Gómez", "Díaz", "Torres"]
        },
        "Bélgica": {
            "first": ["Liam", "Emma", "Noah", "Olivia"],
            "last": ["Peeters", "Janssens", "Maes", "Jacobs"]
        },
        "França": {
            "first": ["Pierre", "Marie", "Jean", "Sophie"],
            "last": ["Martin", "Bernard", "Dubois", "Thomas"]
        },
        "Romênia": {
            "first": ["Andrei", "Maria", "Ion", "Elena"],
            "last": ["Popescu", "Ionescu", "Georgescu", "Dumitrescu"]
        },
        "Ucrânia": {
            "first": ["Oleksandr", "Anna", "Dmytro", "Olena"],
            "last": ["Shevchenko", "Kovalenko", "Boyko", "Bondarenko"]
        },
        "Finlândia": {
            "first": ["Matti", "Anna", "Juhani", "Liisa"],
            "last": ["Korhonen", "Virtanen", "Mäkinen", "Nieminen"]
        },
        "Suécia": {
            "first": ["Erik", "Lars", "Anna", "Karin"],
            "last": ["Johansson", "Andersson", "Karlsson", "Nilsson"]
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