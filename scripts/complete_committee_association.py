import json
import os
import random
import re
from datetime import datetime
import shutil

# Helper functions to generate random numbers.
def random_float(min_val, max_val):
    return round(random.uniform(min_val, max_val), 2)

def random_int(min_val, max_val):
    return random.randint(min_val, max_val)

# List of candidate neighborhood names to use in new committee names.
# Updated candidate neighborhood names to include spaces.
neighborhood_list = [
    "Centro", "Vila Nova", "Boa Vista", "Jardim Paulista", "São Bento", "Liberdade", "Itaparica", "Santa Maria"
]

# Updated mapping for neighborhood names to their corresponding article.
neighborhood_articles = {
    "Centro": "do",
    "Vila Nova": "da",
    "Boa Vista": "da",
    "Jardim Paulista": "do",
    "São Bento": "de",
    "Liberdade": "da",
    "Itaparica": "de",
    "Santa Maria": "da"
}

# List of candidate creative names for new users.
creative_names = [
    "alex", "bruno", "carlos", "diego", "edgar", "fabio", "gabriel", "henrique", "igor", "joao",
    "lucas", "marco", "nicolas", "otavio", "paulo"
]

# List of creative factory names for comiteColTitle.
factory_names = [
    "Fábrica da Aurora", "Fábrica da Esperança", "Fábrica da Inovação", "Fábrica do Progresso", "Fábrica do Futuro"
]

# List of field products produced in plantations.
field_products = ["Banana", "Arroz", "Feijão", "Uva"]

# Function to generate a unique username given a base and list of existing users.
def generate_unique_username(base, users):
    username = base.lower()
    candidate = username
    counter = 1
    existing = {user.get("username", "") for user in users}
    while candidate in existing:
        candidate = f"{username}{counter}"
        counter += 1
    return candidate

# Regex pattern to split a committee name into instance, preposition, and jurisdiction.
pattern = re.compile(r'(.+?)\s+(da|do|de)\s+(.+?)(\s+\d+)?$')

# Setup paths for data and backup.
current_dir = os.path.dirname(__file__)
data_path = os.path.join(current_dir, "..", "data", "data.json")
backup_dir = os.path.join(current_dir, "..", "data", "backups")

# Load the JSON data from data.json.
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Ensure that the users list exists in the data.
if "users" not in data or not isinstance(data["users"], list):
    data["users"] = []

# Get sample committee structure from "Comitê de Fábrica da Marcopolo"
sample_committee = data.get("Comitê de Fábrica da Marcopolo", {})

# Retrieve the product names from the "Conselho Popular Intercontinental da Terra" to use for estoqueDemanda.
intercontinental = data.get("Conselho Popular Intercontinental da Terra", {})
intercontinental_products = intercontinental.get("productNames", [])
if not intercontinental_products:
    intercontinental_products = ["Automóvel", "Alumínio", "Tinta"]

# Global keys which are not to be processed.
global_keys = {"users", "products", "services", "sectors", "matrizTecnologica",
               "demand", "optimization", "config"}

# Process each district council to create missing committees and associated users.
for council_key, council in list(data.items()):
    if not (isinstance(council, dict) and council_key not in global_keys and "UUID" not in council_key):
        continue
    # Process only district councils. Their key must contain "Conselho Popular Distrital"
    if "Conselho Popular Distrital" not in council_key:
        continue
    # Retrieve the sector names (list) for the council.
    sector_list = council.get("sectorNames")
    if not sector_list or not isinstance(sector_list, list):
        continue
    for sector in sector_list:
        found_committee = False
        # Search for an existing committee for the given sector under this council.
        for entry_key, entry in list(data.items()):
            if not (isinstance(entry, dict) and entry_key not in global_keys and "UUID" not in entry_key):
                continue
            if "Comitê" not in entry_key:
                continue
            parent = entry.get("conselhoPopularAssociadoDeComiteOuTrabalhador", "").strip()
            setor = entry.get("setorUnidade", "").strip()
            if parent == council_key and setor == sector:
                found_committee = True
                break

        if not found_committee:
            # Choose a candidate neighborhood name.
            new_neighborhood = random.choice(neighborhood_list)
            article = neighborhood_articles.get(new_neighborhood, "de")
            # Determine whether the committee is "do Campo" or "de Fábrica"
            # If the product for the sector (derived from sector name) is produced in the field,
            # then name the committee as "Comitê do Campo" instead of "Comitê de Fábrica".
            if sector.startswith("Produção de "):
                prod = sector.replace("Produção de ", "")
            else:
                prod = sector
            if prod in field_products:
                base_committee_name = f"Comitê do Campo {article} {new_neighborhood}"
            else:
                base_committee_name = f"Comitê de Fábrica {article} {new_neighborhood}"
            new_committee_key = base_committee_name
            counter = 1
            while new_committee_key in data:
                new_committee_key = f"{base_committee_name} {counter}"
                counter += 1

            # Create a new committee dictionary based on the sample from "Comitê de Fábrica da Marcopolo"
            new_committee = {}
            # Copy any fields from the sample committee (except those we will override)
            for key, value in sample_committee.items():
                if key not in {"productNames", "sectorNames", "finalDemand"}:
                    new_committee[key] = value

            # Override or set the required fields based on the instructions:
            new_committee["setorUnidade"] = sector
            new_committee["limiteEfetivoTrabalhadores"] = random_int(50, 500)
            # Set the associated distrital council key.
            new_committee["conselhoPopularAssociadoDeComiteOuTrabalhador"] = council_key
            # Create estoqueDemanda using products from "Conselho Popular Intercontinental da Terra"
            num_products = min(3, len(intercontinental_products))
            selected_products = random.sample(intercontinental_products, num_products)
            estoque_demanda = []
            for prod_item in selected_products:
                estoque_demanda.append({
                    "bemDeProducao": prod_item,
                    "estoque": str(round(random.uniform(0.2, 10), 1)),
                    "demanda": str(round(random.uniform(0.2, 10), 1))
                })
            new_committee["estoqueDemanda"] = estoque_demanda
            # Create producaoMeta based on the sector: if sector starts with "Produção de ", remove that prefix.
            if sector.startswith("Produção de "):
                produto = sector.replace("Produção de ", "")
            else:
                produto = sector
            quantidade_meta = random_int(100, 100000)
            quantidade_produzida = random_int(100, max(100, quantidade_meta - 1))
            new_committee["producaoMeta"] = [{
                "produto": produto,
                "quantidadeMeta": str(quantidade_meta),
                "quantidadeProduzida": str(quantidade_produzida)
            }]
            # Set a creative factory name for comiteColTitle (must start with "Fábrica da ").
            new_committee["comiteColTitle"] = random.choice(factory_names)
            # Set propostaTrabalhadores with values in same order of magnitude as sample.
            new_committee["propostaTrabalhadores"] = {
                "workerLimit": str(random.choice([900, 1000, 1100])),
                "workerHours": str(random.choice([2, 3, 4])),
                "productionTime": str(random.choice([0.1, 0.3])),
                "weeklyScale": str(random.choice([3, 4, 5])),
                "nightShift": random.choice([True, False])
            }
            # Create vetorTecnologico with the same number of entries as estoqueDemanda.
            vetor = []
            for _ in range(len(estoque_demanda)):
                vetor.append(str(round(random.uniform(0.02, 0.3), 2)))
            new_committee["vetorTecnologico"] = vetor
            # Set remaining constant fields.
            new_committee["totalSocialWorkDessaJurisdicao"] = 0
            new_committee["comiteAssociadoDeTrabalhador"] = ""
            new_committee["associacaoDeMoradoresAssociadaDeTrabalhador"] = ""
            new_committee["partipacaoIndividualEstimadaNoTrabalhoSocial"] = 0
            new_committee["hoursAtElectronicPoint"] = 0
            new_committee["effectivelyPlannedProductionTime"] = random.choice([0.1, 0.3])

            # Insert the new committee into data.
            data[new_committee_key] = new_committee
            print(f"Created new committee: '{new_committee_key}' for sector '{sector}' under council '{council_key}'.")

            # --- Create a new user associated with the new committee ---
            committee_name = new_committee_key
            match = pattern.match(committee_name)
            if match:
                instance_field = match.group(1).strip()
                preposition_field = match.group(2).strip()
                jurisdiction_field = match.group(3).strip()
            else:
                instance_field = committee_name
                preposition_field = ""
                jurisdiction_field = ""
            base_username = random.choice(creative_names)
            username = generate_unique_username(base_username, data["users"])
            full_name = username.capitalize()
            pronoun = random.choice(["masculino", "feminino"])
            new_user = {
                "username": username,
                "password": "123",
                "instance": instance_field,
                "pronoun": pronoun,
                "jurisdiction": jurisdiction_field,
                "preposition": preposition_field,
                "instancePrepositionJurisdictionUUID": committee_name,
                "name": full_name
            }
            data["users"].append(new_user)
            print(f"Created new user: '{username}' associated to committee '{committee_name}'.")

# ---------- New Block: Synchronize products in district councils ----------

# For each district council, verify that every product demanded in a child committee's
# "estoqueDemanda" (field "bemDeProducao") is present in the council's "productNames".
# If not present, insert the new product into "productNames", also:
# - Append to "sectorNames": prepend "Produção de " to the product name unless the product
#   contains "Rede de", in which case use the name as is.
# - Append a random integer (1 to 1000) to "finalDemand".
# - Expand the "inputTable" by adding one column (append a random number between 0.01 and 0.4
#   to each existing row) and one new row (with the new number of columns, each cell a random
#   number between 0.01 and 0.4).
for council_key, council in data.items():
    if not (isinstance(council, dict) and "Conselho Popular Distrital" in council_key):
        continue
    # Ensure the necessary fields exist.
    council.setdefault("productNames", [])
    council.setdefault("sectorNames", [])
    council.setdefault("finalDemand", [])
    council.setdefault("inputTable", [])
    
    # Find all child committees associated with this council.
    for sub_key, sub in data.items():
        if sub_key == council_key:
            continue
        if not isinstance(sub, dict):
            continue
        if sub.get("conselhoPopularAssociadoDeComiteOuTrabalhador", "") != council_key:
            continue
        # sub is a child committee of this district council.
        estoque = sub.get("estoqueDemanda", [])
        for item in estoque:
            product = item.get("bemDeProducao", "").strip()
            if product and product not in council["productNames"]:
                # Add product to productNames.
                council["productNames"].append(product)
                # Append to sectorNames: if product contains "Rede de", use as is; otherwise, prepend "Produção de ".
                if "Rede de" in product:
                    council["sectorNames"].append(product)
                else:
                    council["sectorNames"].append("Produção de " + product)
                # Append a random integer between 1 and 1000 to finalDemand.
                council["finalDemand"].append(random_int(1, 1000))
                # Expand inputTable: First, add one new column to each existing row.
                for row in council["inputTable"]:
                    row.append(round(random.uniform(0.01, 0.4), 2))
                # Determine new column count.
                if council["inputTable"]:
                    new_col_count = len(council["inputTable"][0])
                else:
                    new_col_count = 1
                # Add a new row with new_col_count entries.
                new_row = [round(random.uniform(0.01, 0.4), 2) for _ in range(new_col_count)]
                council["inputTable"].append(new_row)
                print(f"Updated council '{council_key}' with new product '{product}'.")

# ---------- End New Block ----------

# New Block: Normalize columns in the inputTable for each district council.
def normalize_input_table(input_table):
    if not input_table:
        return input_table
    num_rows = len(input_table)
    num_cols = len(input_table[0])
    # Normalize each column separately.
    for col in range(num_cols):
        # Sum values for this column.
        col_sum = 0
        for row in input_table:
            value = row[col]
            # Assume the cell is a numeric value.
            col_sum += value if isinstance(value, (int, float)) else 0
        # If the sum is >= 0.9, scale each value in the column.
        if col_sum >= 0.9 and col_sum > 0:
            factor = 0.9 / col_sum
            for i in range(num_rows):
                if isinstance(input_table[i][col], (int, float)):
                    input_table[i][col] = round(input_table[i][col] * factor, 2)
    return input_table

# Process each district council and normalize its inputTable before saving.
for council_key, council in data.items():
    if isinstance(council, dict) and "Conselho Popular Distrital" in council_key:
        if "inputTable" in council and isinstance(council["inputTable"], list):
            normalize_input_table(council["inputTable"])
            print(f"Normalized inputTable for council '{council_key}'.")

# Backup the current data.json before writing changes.
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)
timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
backup_filename = f"dataBackup{timestamp}.json"
backup_path = os.path.join(backup_dir, backup_filename)
shutil.copy2(data_path, backup_path)
print(f"Backup of original data.json created at '{backup_path}'.")

# Write the updated data back to data.json.
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("New committees, associated users, and council product updates completed. data.json has been updated.")