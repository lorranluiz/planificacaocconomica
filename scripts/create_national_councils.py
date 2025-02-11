import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_countries_by_region():
    """Returns mapping of regions to their countries"""
    return {
        "América Central": ["Costa Rica", "Guatemala"],
        "Caribe Insular": ["Cuba", "República Dominicana"],
        "Região do Canadá": ["Canadá"],
        "Região do México": ["México"],
        "Região dos Estados Unidos": ["Estados Unidos"],
        "Região Andina": ["Colômbia", "Peru"],
        "Região Platina": ["Argentina", "Paraguai"],
        "Região das Guianas": ["Guiana", "Suriname"],
        "Europa Meridional": ["Espanha", "Itália"],
        "Europa Ocidental": ["França", "Bélgica"],
        "Europa Oriental": ["Ucrânia", "Romênia"],
        "Europa Setentrional": ["Suécia", "Finlândia"],
        "Australásia": ["Austrália", "Nova Zelândia"],
        "Melanésia": ["Papua-Nova Guiné", "Ilhas Salomão"],
        "Micronésia": ["Estados Federados da Micronésia", "Palau"],
        "Polinésia": ["Samoa", "Tonga"],
        "África Subsaariana Austral": ["África do Sul", "Namíbia"],
        "África Subsaariana Central": ["República Democrática do Congo", "Chade"],
        "África Subsaariana Ocidental": ["Nigéria", "Gana"],
        "África Subsaariana Oriental": ["Quênia", "Tanzânia"],
        "Norte da África": ["Egito", "Argélia"],
        "Ásia Central": ["Cazaquistão", "Uzbequistão"],
        "Ásia Ocidental": ["Turquia", "Arábia Saudita"],
        "Ásia Oriental": ["China", "Coreia do Sul"],
        "Sudeste Asiático": ["Indonésia", "Vietnã"],
        "Sul da Ásia": ["Índia", "Paquistão"]
    }

def get_names_by_country():
    """Returns mapping of countries to their characteristic names"""
    names_dict = {
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
        # Add DEFAULT entry at the end
        "DEFAULT": {
            "first": ["Default", "Test"],
            "last": ["Name", "User"]
        }
    }
    return names_dict

def create_national_councils():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    backup_dir = os.path.join(current_dir, "..", "data", "backups")
    
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"data_backup_{timestamp}.json")
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    shutil.copy2(data_path, backup_path)
    
    # Get Brasil council as template
    template_council = data.get("Conselho Popular Nacional do Brasil", {})
    if not template_council:
        print("Template council not found!")
        return
    
    countries_by_region = get_countries_by_region()
    names_by_country = get_names_by_country()
    
    for region, countries in countries_by_region.items():
        regional_council_name = f"Conselho Popular Regional Continental {get_region_preposition(region)}"
        
        for country in countries:
            council_name = f"Conselho Popular Nacional {get_country_preposition(country)}"
            
            if council_name in data:
                print(f"Council {council_name} already exists, skipping...")
                continue
            
            # Create new national council
            new_council = copy.deepcopy(template_council)
            new_council["conselhoPopularAssociadoDeConselhoPopular"] = regional_council_name
            
            # Add council to data
            data[council_name] = new_council
            print(f"Created council: {council_name}")
            
            # Create associated user
            user_name = generate_name_for_country(country, names_by_country)
            username = user_name.split()[0].lower()
            
            new_user = {
                "username": username,
                "password": "123",
                "name": user_name,
                "pronoun": random.choice(["masculino", "feminino"]),
                "instance": "Conselho Popular Nacional",
                "preposition": get_country_preposition(country).split()[0],
                "jurisdiction": " ".join(get_country_preposition(country).split()[1:]),
                "instancePrepositionJurisdictionUUID": council_name
            }
            
            data["users"].append(new_user)
            print(f"Created user: {username} for council: {council_name}")
    
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("National councils and users creation completed!")

def get_region_preposition(region):
    """Returns region name with proper preposition"""
    if region.startswith("Região"):
        return f"da {region}"
    return f"da {region}"

def get_country_preposition(country):
    """Returns country name with proper preposition"""
    if country in ["Estados Unidos", "Estados Federados da Micronésia"]:
        return f"dos {country}"
    return f"do {country}" if is_masculine(country) else f"da {country}"

def is_masculine(country):
    """Returns True if country name is grammatically masculine in Portuguese"""
    feminine_countries = {
        "República Dominicana", "França", "Bélgica", "Ucrânia", "Romênia", 
        "Suécia", "Finlândia", "Austrália", "Nova Zelândia", "Papua-Nova Guiné",
        "Índia", "China", "Coreia do Sul", "Indonésia", "Turquia", 
        "Arábia Saudita"
    }
    return country not in feminine_countries

def generate_name_for_country(country, names_by_country):
    """Generates a characteristic name for a given country"""
    default_names = {
        "first": ["Default", "Test"],
        "last": ["Name", "User"]
    }
    names = names_by_country.get(country, default_names)
    return f"{random.choice(names['first'])} {random.choice(names['last'])}"

if __name__ == "__main__":
    create_national_councils()