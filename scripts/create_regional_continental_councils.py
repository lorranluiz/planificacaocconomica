import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_region_name_with_article(region):
    """Returns proper name with article based on region gender/number"""
    region_formats = {
        # África
        "Norte da África": "do Norte da África",
        "África Subsaariana Ocidental": "da África Subsaariana Ocidental",
        "África Subsaariana Central": "da África Subsaariana Central", 
        "África Subsaariana Oriental": "da África Subsaariana Oriental",
        "África Subsaariana Austral": "da África Subsaariana Austral",
        
        # América do Norte
        "Região do Canadá": "da Região do Canadá",
        "Região dos Estados Unidos": "da Região dos Estados Unidos", 
        "Região do México": "da Região do México",
        
        # América Central e Caribe
        "América Central": "da América Central",
        "Caribe Insular": "do Caribe Insular",
        
        # América do Sul
        "Região Andina": "da Região Andina",
        "Região Platina": "da Região Platina",
        "Região Guianas": "da Região das Guianas",
        "Região Continental do Brasil": "da Região Continental do Brasil",
        
        # Ásia
        "Ásia Central": "da Ásia Central",
        "Ásia Oriental": "da Ásia Oriental",
        "Sudeste Asiático": "do Sudeste Asiático",
        "Sul da Ásia": "do Sul da Ásia", 
        "Ásia Ocidental": "da Ásia Ocidental",
        
        # Europa
        "Europa Ocidental": "da Europa Ocidental",
        "Europa Setentrional": "da Europa Setentrional",
        "Europa Oriental": "da Europa Oriental", 
        "Europa Meridional": "da Europa Meridional",
        
        # Oceania
        "Australásia": "da Australásia",
        "Melanésia": "da Melanésia",
        "Micronésia": "da Micronésia",
        "Polinésia": "da Polinésia"
    }
    return region_formats.get(region, region)

def generate_regional_name(region):
    """Generate names characteristic of each region"""
    region_names = {
        # América do Norte
        "Região do Canadá": {
            "first": ["Liam", "Noah", "Emma", "Olivia"],
            "last": ["Smith", "Brown", "Lee", "Wilson"]
        },
        "Região dos Estados Unidos": {
            "first": ["James", "Ava", "Michael", "Sophia"],
            "last": ["Johnson", "Davis", "Clark", "Taylor"]
        },
        "Região do México": {
            "first": ["Santiago", "Valentina", "Mateo", "Camila"],
            "last": ["García", "López", "Martínez", "Hernández"]
        },
        # América Central e Caribe
        "América Central": {
            "first": ["Diego", "Isabella", "Carlos", "Lucia"],
            "last": ["Rodríguez", "González", "Pérez", "Ramírez"]
        },
        "Caribe Insular": {
            "first": ["Jamal", "Shanice", "Malik", "Aaliyah"],
            "last": ["Brown", "Williams", "Green", "Campbell"]
        },
        # América do Sul
        "Região Andina": {
            "first": ["Alejandro", "Sofia", "Daniel", "Valeria"],
            "last": ["Fernández", "Morales", "Vargas", "Castillo"]
        },
        "Região Platina": {
            "first": ["Thiago", "Martina", "Lucas", "Julieta"],
            "last": ["Silva", "Costa", "Pereira", "Rojas"]
        },
        "Região Guianas": {
            "first": ["Rajiv", "Priya", "Arun", "Anika"],
            "last": ["Persaud", "Singh", "Khan", "Mohamed"]
        },
        "Região Continental do Brasil": {
            "first": ["Gabriel", "Alice", "Enzo", "Laura"],
            "last": ["Santos", "Oliveira", "Souza", "Lima"]
        },
        # África
        "Norte da África": {
            "first": ["Amir", "Leila", "Samir", "Nadia"],
            "last": ["El-Masri", "Benali", "Khoury", "Abbas"]
        },
        "África Subsaariana Ocidental": {
            "first": ["Kwame", "Amina", "Chukwu", "Fatou"],
            "last": ["Diallo", "Traoré", "Ndiaye", "Sow"]
        },
        "África Subsaariana Central": {
            "first": ["Kofi", "Zola", "Tunde", "Nia"],
            "last": ["Mbala", "Ngoma", "Okoro", "Diallo"]
        },
        "África Subsaariana Oriental": {
            "first": ["Juma", "Aisha", "Baraka", "Neema"],
            "last": ["Mwangi", "Omondi", "Tesfaye", "Abebe"]
        },
        "África Subsaariana Austral": {
            "first": ["Thabo", "Lerato", "Sipho", "Zanele"],
            "last": ["Dlamini", "Ndlovu", "Mbeki", "Zulu"]
        },
        # Ásia
        "Ásia Central": {
            "first": ["Aibek", "Gulnaz", "Timur", "Zarina"],
            "last": ["Nazarbayev", "Abdullaev", "Karimov", "Tursun"]
        },
        "Ásia Oriental": {
            "first": ["Hiroshi", "Yuki", "Min-Jun", "Hana"],
            "last": ["Tanaka", "Kim", "Wong", "Suzuki"]
        },
        "Sudeste Asiático": {
            "first": ["Anh", "Mei", "Rizal", "Siti"],
            "last": ["Nguyen", "Tran", "Wong", "Abdullah"]
        },
        "Sul da Ásia": {
            "first": ["Aarav", "Priya", "Rohan", "Anika"],
            "last": ["Patel", "Sharma", "Khan", "Singh"]
        },
        "Ásia Ocidental": {
            "first": ["Omar", "Layla", "Ali", "Yasmin"],
            "last": ["Al-Farouq", "Al-Mansoor", "Hassan", "Ibrahim"]
        },
        # Europa
        "Europa Ocidental": {
            "first": ["Lucas", "Emma", "Louis", "Clara"],
            "last": ["Müller", "Dupont", "Rossi", "Schmidt"]
        },
        "Europa Setentrional": {
            "first": ["Erik", "Freja", "Lars", "Ingrid"],
            "last": ["Johansson", "Nielsen", "Virtanen", "Hansen"]
        },
        "Europa Oriental": {
            "first": ["Ivan", "Anastasia", "Dmitri", "Olga"],
            "last": ["Ivanov", "Petrov", "Sokolov", "Kuznetsov"]
        },
        "Europa Meridional": {
            "first": ["Matteo", "Sofia", "Luca", "Giulia"],
            "last": ["García", "Silva", "Fernández", "Costa"]
        },
        # Oceania
        "Australásia": {
            "first": ["Jack", "Charlotte", "William", "Mia"],
            "last": ["Smith", "Jones", "Brown", "Wilson"]
        },
        "Melanésia": {
            "first": ["Tama", "Lani", "Manu", "Sina"],
            "last": ["Koro", "Tui", "Vatu", "Sulu"]
        },
        "Micronésia": {
            "first": ["Kaito", "Hana", "Ren", "Aya"],
            "last": ["Nakamura", "Tanaka", "Sato", "Yamamoto"]
        },
        "Polinésia": {
            "first": ["Tane", "Rangi", "Mana", "Hina"],
            "last": ["Tevita", "Manu", "Tui", "Fale"]
        }
    }
    
    names = region_names.get(region, {
        "first": ["Default", "Regional"],
        "last": ["Name", "Leader"]
    })
    
    return f"{random.choice(names['first'])} {random.choice(names['last'])}"

def get_continental_council_name(continent):
    """Returns the full name of the continental council"""
    continent_councils = {
        "África": "Conselho Popular Continental da África",
        "América do Norte": "Conselho Popular Continental da América do Norte",
        "América Central e Caribe": "Conselho Popular Continental da América Central e Caribe",
        "América do Sul": "Conselho Popular Continental da América do Sul",
        "Ásia": "Conselho Popular Continental da Ásia",
        "Europa": "Conselho Popular Continental da Europa",
        "Oceania": "Conselho Popular Continental da Oceania"
    }
    return continent_councils[continent]

def create_regional_continental_councils():
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
    
    # Get Brasil council as template
    template_council = data.get("Conselho Popular Regional Continental do Brasil", {})
    
    if not template_council:
        print("Template council not found!")
        return

    # Dictionary mapping continents to their regions
    continent_regions = {
        "África": [
            "Norte da África",
            "África Subsaariana Ocidental", 
            "África Subsaariana Central",
            "África Subsaariana Oriental",
            "África Subsaariana Austral"
        ],
        "América do Norte": [
            "Região do Canadá",
            "Região dos Estados Unidos",
            "Região do México"
        ],
        "América Central e Caribe": [
            "América Central",
            "Caribe Insular"
        ],
        "América do Sul": [
            "Região Andina",
            "Região Platina", 
            "Região Guianas",
            "Região Continental do Brasil"
        ],
        "Ásia": [
            "Ásia Central",
            "Ásia Oriental",
            "Sudeste Asiático", 
            "Sul da Ásia",
            "Ásia Ocidental"
        ],
        "Europa": [
            "Europa Ocidental",
            "Europa Setentrional",
            "Europa Oriental",
            "Europa Meridional"
        ],
        "Oceania": [
            "Australásia",
            "Melanésia",
            "Micronésia",
            "Polinésia"
        ]
    }

    # Create regional councils for each continent
    for continent, regions in continent_regions.items():
        continental_council = get_continental_council_name(continent)
        
        for region in regions:
            region_with_article = get_region_name_with_article(region)
            council_name = f"Conselho Popular Regional Continental {region_with_article}"
            
            if council_name in data:
                print(f"Council {council_name} already exists, skipping...")
                continue
                
            # Create new regional council
            new_council = copy.deepcopy(template_council)
            new_council["conselhoPopularAssociadoDeConselhoPopular"] = continental_council
            
            # Add council to data
            data[council_name] = new_council
            print(f"Created council: {council_name}")
            
            # Create associated user
            full_name = generate_regional_name(region)
            username = full_name.split()[0].lower()
            
            new_user = {
                "username": username,
                "password": "123",
                "name": full_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Conselho Popular Regional Continental",
                "preposition": region_with_article.split()[0],
                "jurisdiction": " ".join(region_with_article.split()[1:]),
                "instancePrepositionJurisdictionUUID": council_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for council: {council_name}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Regional continental councils and users creation completed!")

if __name__ == "__main__":
    create_regional_continental_councils()