import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_country_regions(country_name):
    """Get regions for a given country from informacoes_de_paises.json"""
    current_dir = os.path.dirname(__file__)
    info_path = os.path.join(current_dir, "..", "informacoes_de_paises.json")
    
    with open(info_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for country in data["países"]:
        if country["nome"] == country_name:
            return [region.get("nome") for region in country["regiões"] if region.get("nome")]
    
    return []

def get_region_name_with_article(region_name, country_name):
    """Returns proper name with article based on region and country gender"""
    # Special cases and patterns for masculine regions
    masculine_patterns = [
        "Norte", "Sul", "Nordeste", "Noroeste", "Sudeste", "Sudoeste", "Centro",
        "Oeste", "Leste", "Interior", "Estado", "Distrito"
    ]
    
    feminine_patterns = [
        "Região", "Província", "Área"
    ]
    
    # Special cases for countries that use "da/do"
    country_articles = {
        "Brasil": "do",
        "Argentina": "da",
        "França": "da",
        "Espanha": "da",
        "Portugal": "de",
        "Índia": "da",
        "China": "da",
        "Japão": "do",
        "Estados Unidos": "dos",
        "Reino Unido": "do"
    }
    
    # Get country article (default to "do" if not specified)
    country_article = country_articles.get(country_name, "do")
    
    # Determine region article
    is_masculine = any(pattern in region_name for pattern in masculine_patterns)
    is_feminine = any(pattern in region_name for pattern in feminine_patterns)
    region_article = "do" if is_masculine and not is_feminine else "da"
    
    return {
        "full_name": f"{region_article} {region_name} {country_article} {country_name}",
        "region_article": region_article,
        "country_article": country_article
    }

def get_names_by_country():
    """Returns mapping of countries to their characteristic names"""
    return {
         # América
    "Costa Rica": {
        "first": ["José", "María", "Andrés", "Sofía"],
        "last": ["Rodríguez", "Jiménez", "Vargas", "Solano"]
    },
    "Guatemala": {
        "first": ["Carlos", "Juana", "Miguel", "Rosa"],
        "last": ["Pérez", "González", "López", "Castillo"]
    },
    "Cuba": {
        "first": ["Ernesto", "Yanet", "Alejandro", "Lisandra"],
        "last": ["Fernández", "Martínez", "Díaz", "Torres"]
    },
    "República Dominicana": {
        "first": ["Juan", "Luz", "Pedro", "Carolina"],
        "last": ["Peña", "Ramírez", "Herrera", "Cruz"]
    },
    "Canadá": {
        "first": ["William", "Emily", "Liam", "Olivia"],
        "last": ["Smith", "Johnson", "Brown", "Anderson"]
    },
    "México": {
        "first": ["Guadalupe", "Fernando", "Diego", "Valeria"],
        "last": ["Hernández", "Ramírez", "Ortega", "Chávez"]
    },
    "Estados Unidos": {
        "first": ["Michael", "Jessica", "James", "Ashley"],
        "last": ["Williams", "Miller", "Davis", "Wilson"]
    },
    "Colômbia": {
        "first": ["Santiago", "Camila", "Juan", "Natalia"],
        "last": ["Gómez", "Rojas", "Castaño", "Muñoz"]
    },
    "Peru": {
        "first": ["José", "Daniela", "Ricardo", "Mónica"],
        "last": ["Quispe", "Chávez", "Ríos", "Salazar"]
    },
    "Argentina": {
        "first": ["Facundo", "Martina", "Gonzalo", "Lucía"],
        "last": ["Fernández", "Sosa", "Domínguez", "Acosta"]
    },
    "Paraguai": {
        "first": ["Jorge", "Antonella", "Rodrigo", "Fiorella"],
        "last": ["Benítez", "Duarte", "Giménez", "López"]
    },
    "Guiana": {
        "first": ["Andrew", "Shania", "Kevin", "Priya"],
        "last": ["Persaud", "Singh", "Adams", "Roberts"]
    },
    "Suriname": {
        "first": ["Rajiv", "Anisha", "Michael", "Naomi"],
        "last": ["Jalim", "Bouterse", "Pinas", "Hasnoe"]
    },
    # Europa
    "Espanha": {
        "first": ["Alejandro", "Carmen", "Javier", "Laura"],
        "last": ["García", "Martínez", "Fernández", "López"]
    },
    "Itália": {
        "first": ["Giovanni", "Francesca", "Matteo", "Chiara"],
        "last": ["Rossi", "Bianchi", "Romano", "Conti"]
    },
    "França": {
        "first": ["Louis", "Amélie", "Pierre", "Claire"],
        "last": ["Dupont", "Moreau", "Lefebvre", "Lambert"]
    },
    "Bélgica": {
        "first": ["Arthur", "Manon", "Théo", "Elise"],
        "last": ["Janssens", "Dubois", "Peeters", "Simon"]
    },
    "Ucrânia": {
        "first": ["Oleksandr", "Yulia", "Dmytro", "Kateryna"],
        "last": ["Shevchenko", "Kovalenko", "Petrenko", "Morozov"]
    },
    "Romênia": {
        "first": ["Andrei", "Ioana", "Cristian", "Elena"],
        "last": ["Popescu", "Ionescu", "Dumitrescu", "Stan"]
    },
    "Suécia": {
        "first": ["Erik", "Ingrid", "Lars", "Linnea"],
        "last": ["Johansson", "Andersson", "Lindström", "Bergman"]
    },
    "Finlândia": {
        "first": ["Mika", "Aino", "Jukka", "Saara"],
        "last": ["Korhonen", "Virtanen", "Heikkinen", "Laine"]
    },
    # Oceania
    "Austrália": {
        "first": ["Jack", "Chloe", "Ethan", "Mia"],
        "last": ["Taylor", "Harris", "White", "Martin"]
    },
    "Nova Zelândia": {
        "first": ["Liam", "Isla", "Oliver", "Harper"],
        "last": ["Thompson", "Walker", "Evans", "Scott"]
    },
    "Papua-Nova Guiné": {
        "first": ["Gabriel", "Daisy", "Simon", "Lili"],
        "last": ["Wama", "Kila", "Raka", "Kora"]
    },
    "Ilhas Salomão": {
        "first": ["John", "Mary", "Peter", "Alice"],
        "last": ["Maeliau", "Rarua", "Taupongi", "Kera"]
    },
    "Estados Federados da Micronésia": {
        "first": ["Joseph", "Leilani", "Francis", "Lani"],
        "last": ["Palik", "Nena", "Susaia", "Henry"]
    },
    "Palau": {
        "first": ["Joshua", "Maria", "Taro", "Lina"],
        "last": ["Remengesau", "Ngiraked", "Reklai", "Sadang"]
    },
    "Samoa": {
        "first": ["Tasi", "Moana", "Sione", "Leilani"],
        "last": ["Tupuola", "Fale", "Matai", "Aiono"]
    },
    "Tonga": {
        "first": ["Maka", "Ana", "Sione", "Mele"],
        "last": ["Tupou", "Vea", "Folau", "Manu"]
    },
    # África
    "África do Sul": {
        "first": ["Sipho", "Thandi", "Johan", "Lerato"],
        "last": ["Mokoena", "Naidoo", "Van der Merwe", "Dlamini"]
    },
    "Namíbia": {
        "first": ["Petrus", "Julia", "Thomas", "Maria"],
        "last": ["Amadhila", "Uushona", "Muha", "Kamatuka"]
    },
    "República Democrática do Congo": {
        "first": ["Jean", "Amina", "Didier", "Fatou"],
        "last": ["Mbala", "Kabila", "Tshibanda", "Kalonji"]
    },
    "Chade": {
        "first": ["Mahamat", "Halima", "Idriss", "Aïcha"],
        "last": ["Abakar", "Oumar", "Hassan", "Tchalla"]
    },
    "Nigéria": {
        "first": ["Chinedu", "Ngozi", "Tunde", "Aisha"],
        "last": ["Okonkwo", "Balogun", "Adeyemi", "Uche"]
    },
    "Gana": {
        "first": ["Kwame", "Akosua", "Kojo", "Yaa"],
        "last": ["Mensah", "Osei", "Boateng", "Amponsah"]
    },
    "Quênia": {
        "first": ["Juma", "Aisha", "Mwangi", "Njeri"],
        "last": ["Otieno", "Wanjiru", "Kamau", "Mutua"]
    },
    "Tanzânia": {
        "first": ["Baraka", "Zainab", "Juma", "Amina"],
        "last": ["Ngowi", "Mwakalebela", "Magesa", "Kimaro"]
    },
    "Egito": {
        "first": ["Ahmed", "Fatima", "Omar", "Mariam"],
        "last": ["Hassan", "Mohamed", "Youssef", "Fathy"]
    },
    "Argélia": {
        "first": ["Mehdi", "Yasmine", "Rachid", "Nadia"],
        "last": ["Benali", "Cherif", "Othmani", "Bouzid"]
    },
    # Ásia
    "Cazaquistão": {
        "first": ["Nursultan", "Aigerim", "Yerlan", "Dana"],
        "last": ["Zhaksylyk", "Amankulov", "Beketov", "Tursunov"]
    },
    "Uzbequistão": {
        "first": ["Rustam", "Gulnara", "Alisher", "Nilufar"],
        "last": ["Karimov", "Tashkent", "Nazarov", "Mirzaev"]
    },
    "Turquia": {
        "first": ["Mehmet", "Ayşe", "Emre", "Zeynep"],
        "last": ["Yıldız", "Demir", "Akgün", "Şahin"]
    },
    "Arábia Saudita": {
        "first": ["Faisal", "Layla", "Abdulaziz", "Amina"],
        "last": ["Al-Farsi", "Al-Qahtani", "Al-Shehri", "Al-Mutairi"]
    },
    "China": {
        "first": ["Wei", "Li", "Zhang", "Xiaomei"],
        "last": ["Wang", "Liu", "Chen", "Zhao"]
    },
    "Coreia do Sul": {
        "first": ["Jisoo", "Minho", "Hyejin", "Taehyung"],
        "last": ["Kim", "Park", "Choi", "Jeon"]
    },
    "Indonésia": {
        "first": ["Agung", "Siti", "Budi", "Rina"],
        "last": ["Wijaya", "Saputra", "Prasetyo", "Rahman"]
    },
    "Vietnã": {
        "first": ["Nguyen", "Linh", "Minh", "Hoa"],
        "last": ["Tran", "Pham", "Le", "Nguyen"]
    },
    "Índia": {
        "first": ["Rahul", "Priya", "Arjun", "Anjali"],
        "last": ["Sharma", "Patel", "Gupta", "Verma"]
    },
    "Paquistão": {
        "first": ["Adeel", "Fatima", "Hassan", "Sana"],
        "last": ["Khan", "Ahmed", "Ali", "Malik"]
    },
        # Default entry
        "DEFAULT": {
            "first": ["Default", "Test"],
            "last": ["Name", "User"]
        }
    }

def generate_unique_username(base_username, existing_users):
    """Generate a unique username by adding numbers if necessary"""
    if not any(user["username"] == base_username for user in existing_users):
        return base_username
    
    # Find existing usernames with same base and number pattern
    similar_usernames = [
        user["username"] for user in existing_users 
        if user["username"].startswith(base_username)
    ]
    
    # If base exists but no numbered versions exist
    if base_username in similar_usernames and not any(
        user["username"].startswith(base_username) and user["username"][len(base_username):].isdigit()
        for user in existing_users
    ):
        return f"{base_username}1"
    
    # Find highest number used
    max_num = 0
    for username in similar_usernames:
        if username.startswith(base_username):
            suffix = username[len(base_username):]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    
    return f"{base_username}{max_num + 1}"

def create_national_regional_councils():
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
    
    # Find all national councils
    national_councils = [
        council_name for council_name in data.keys()
        if council_name.startswith("Conselho Popular Nacional")
    ]
    
    # Get template from existing council
    template_council = data.get("Conselho Popular Regional Nacional do Sudeste do Brasil", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load names dictionary
    names_by_country = get_names_by_country()
    
    # Process each national council
    for national_council in national_councils:
        # Extract country name
        if "do " in national_council:
            country_name = national_council.split("do ")[-1]
        elif "da " in national_council:
            country_name = national_council.split("da ")[-1]
        elif "dos " in national_council:
            country_name = national_council.split("dos ")[-1]
        else:
            continue
            
        # Get regions for this country
        regions = get_country_regions(country_name)
        
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
    print("National regional councils creation completed!")

if __name__ == "__main__":
    create_national_regional_councils()