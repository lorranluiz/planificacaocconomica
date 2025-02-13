import json
import os
from datetime import datetime
import shutil
import copy
import random

def get_article_for_state(state):
    if state.startswith(("A", "E", "I", "O", "U")):
        return "do"
    return "da"

def generate_unique_username(base_username, users):
    """Generates a unique username by appending a number if necessary"""
    usernames = {user["username"] for user in users}
    if base_username not in usernames:
        return base_username
    
    i = 1
    while f"{base_username}{i}" in usernames:
        i += 1
    return f"{base_username}{i}"

def get_municipalities():
    return [
        "Tóquio", "Xangai", "Deli", "Mumbai", "Pequim", "Osaka", "Dhaka", "Karachi", "Istambul", "Calcutá",
        "Banguecoque", "Chongqing", "Shenzhen", "Chennai", "Seul", "Jakarta", "Lahore", "Teerã", "Ho Chi Minh", "Hong Kong",
        "Bagdá", "Riad", "Singapura", "Ancara", "Chengdu", "Nanjing", "Wuhan", "Hangzhou", "Xi'an", "Surabaia",
        "Ahmedabad", "Kolkata", "Yangon", "Fukuoka", "Kobe", "Kyoto", "Nagoya", "Yokohama", "Busan", "Daegu",
        "Guangzhou", "Tianjin", "Shenyang", "Harbin", "Qingdao", "Dalian", "Ningbo", "Fuzhou", "Xiamen", "Zhengzhou",
        "Changsha", "Kunming", "Nanchang", "Shijiazhuang", "Jinan", "Hefei", "Taipei", "Kaohsiung", "Taichung", "Tainan",
        "Cairo", "Lagos", "Kinshasa", "Luanda", "Nairóbi", "Adis Abeba", "Abidjan", "Alexandria", "Cidade do Cabo", "Casablanca",
        "Durban", "Joanesburgo", "Nova Iorque", "Accra", "Dar es Salaam", "Kampala", "Bamako", "Dakar", "Ouagadougou", "Conacri",
        "Maputo", "Harare", "Lusaka", "Bangui", "Libreville", "Malabo", "Bissau", "São Tomé", "Porto-Novo", "Lomé",
        "Windhoek", "Gaborone", "Maseru", "Mbabane", "Moroni", "Victoria", "Port Louis", "Praia", "Nuakchott", "Trípoli",
        "Túnis", "Argel", "Rabat", "Tânger", "Marraquexe", "Fez", "Agadir", "Bujumbura", "Kigali", "Mogadíscio",
        "Juba", "Khartum", "Asmara", "Djibouti", "Hargeisa", "Berbera", "Mombasa", "Zanzibar", "Lubumbashi", "Mbuji-Mayi",
        "Cidade do México", "Nova Iorque", "Los Angeles", "Chicago", "Toronto", "Houston", "Montreal", "Filadélfia", "Phoenix", "San Diego",
        "Dallas", "San Antonio", "San Jose", "Austin", "Jacksonville", "Indianápolis", "São Francisco", "Columbus", "Charlotte", "Seattle",
        "Denver", "Washington", "Boston", "El Paso", "Detroit", "Nashville", "Memphis", "Portland", "Oklahoma City", "Las Vegas",
        "Baltimore", "Louisville", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Kansas City", "Atlanta", "Miami",
        "Ottawa", "Vancouver", "Calgary", "Edmonton", "Winnipeg", "Quebec", "Hamilton", "Halifax", "Victoria", "Regina",
        "Saskatoon", "St. John's", "Yellowknife", "Whitehorse", "Iqaluit", "Anchorage", "Honolulu", "Juneau", "Fairbanks", "Nome",
        "Cidade do Panamá", "San José", "Tegucigalpa", "Manágua", "San Salvador", "Guatemala", "Santo Domingo", "Havana", "Kingston", "Porto Príncipe",
        "Nassau", "Bridgetown", "Castries", "Roseau", "São Jorge", "São João", "Basseterre", "Kingstown", "Port of Spain", "Belmopan",
        "Belize City", "Liberdade", "Choloma", "San Pedro Sula", "León", "Chinandega", "Masaya", "Granada", "Estelí", "Matagalpa",
        "Santa Ana", "San Miguel", "Sonsonate", "La Libertad", "Usulután", "San Vicente", "Zacatecoluca", "Cojutepeque", "Ahuachapán", "Chalatenango",
        "Puerto Barrios", "Quetzaltenango", "Escuintla", "Retalhuleu", "Mazatenango", "Cobán", "Huehuetenango", "Jutiapa", "Santa Cruz del Quiché", "Totonicapán",
        "São Paulo", "Lima", "Bogotá", "Rio de Janeiro", "Santiago", "Caracas", "Buenos Aires", "Brasília", "Medellín", "Cali",
        "Fortaleza", "Salvador", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre", "Belém", "Goiânia", "Guarulhos",
        "Campinas", "São Luís", "Maceió", "Teresina", "Natal", "João Pessoa", "Florianópolis", "Cuiabá", "Aracaju", "Porto Velho",
        "Boa Vista", "Rio Branco", "Macapá", "Vitória", "Palmas", "Córdoba", "Rosário", "Mar del Plata", "Mendoza", "La Plata",
        "Montevidéu", "Punta del Este", "Salto", "Paysandú", "Maldonado", "Rivera", "Artigas", "Tacuarembó", "Durazno", "Colônia do Sacramento",
        "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Nova Zelândia", "Auckland", "Wellington",
        "Christchurch", "Hamilton", "Tauranga", "Dunedin", "Palmerston North", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin",
        "Honiara", "Port Moresby", "Nouméa", "Suva", "Apia", "Pago Pago", "Funafuti", "Tarawa", "Majuro", "Yaren",
        "Alofi", "Nukuʻalofa", "Mata-Utu", "Palikir", "South Tarawa", "Kolonia", "Luganville", "Port Vila", "Lautoka", "Labasa",
        "Levuka", "Savusavu", "Nadi", "Sigatoka", "Rakiraki", "Ba", "Lautoka", "Nausori", "Tavua", "Koror",
        "Londres", "Berlim", "Madri", "Roma", "Paris", "Bucareste", "Viena", "Budapeste", "Varsóvia", "Barcelona",
        "Cracóvia", "Milão", "Praga", "Sófia", "Bruxelas", "Atenas", "Dublin", "Lisboa", "Copenhague", "Estocolmo",
        "Helsínquia", "Oslo", "Riga", "Vilnius", "Tallinn", "Zagreb", "Sarajevo", "Podgorica", "Skopje", "Tirana",
        "Belgrado", "Pristina", "Chișinău", "Kiev", "Minsk", "Moscou", "São Petersburgo", "Nizhny Novgorod", "Kazan", "Samara",
        "Rostov", "Ufa", "Volgogrado", "Perm", "Voronezh", "Krasnodar", "Sochi", "Yekaterinburg", "Chelyabinsk", "Novosibirsk"
    ]

def to_roman(n):
    roman_numerals = {
        1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
        6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
    }
    return roman_numerals.get(n, str(n))

def create_municipal_councils():
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
    
    # Get template
    template_council = data.get("Conselho Popular Municipal de Petrópolis", {})
    
    if not template_council:
        print("Template council not found!")
        return
    
    # Load municipalities list
    municipalities = get_municipalities()
    
    # Process each regional state council
    for council_name in list(data.keys()):
        if "Conselho Popular Regional Estadual" in council_name:
            # Create two new municipal councils
            for _ in range(2):
                municipality = random.choice(municipalities)
                new_council_base = f"Conselho Popular Municipal de {municipality}"
                new_council = new_council_base
                
                # Add Roman numerals if council already exists
                i = 1
                while new_council in data:
                    i += 1
                    new_council = f"{new_council_base} {to_roman(i)}"
                
                # Create new municipal council
                new_council_data = copy.deepcopy(template_council)
                new_council_data["conselhoPopularAssociadoDeConselhoPopular"] = council_name
                
                # Add council to data
                data[new_council] = new_council_data
                print(f"Created council: {new_council} associated with {council_name}")
                
                # Create associated user
                full_name = f"User {new_council}"
                base_username = full_name.split()[0].lower()
                username = generate_unique_username(base_username, data["users"])
                
                new_user = {
                    "username": username,
                    "password": "123",
                    "name": full_name,
                    "pronoun": random.choice(["masculino", "feminino"]),
                    "instance": "Conselho Popular Municipal",
                    "preposition": "de",
                    "jurisdiction": municipality,
                    "instancePrepositionJurisdictionUUID": new_council
                }
                
                data["users"].append(new_user)
                print(f"Created user: {username} for council: {new_council}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Municipal councils creation completed!")

if __name__ == "__main__":
    create_municipal_councils()