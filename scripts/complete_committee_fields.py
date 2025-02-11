import json
import random
import os

# --------------------------------------------------------------------------------------
# This script processes and completes various fields in the data.json file, which
# stores details about councils, committees, and other entities. The data structure
# is organized as a JSON object whose keys include names of councils, committees,
# users, products, etc. For committee/council entries (i.e., keys that are not in the
# global_keys set and do not include "UUID"), the script updates several sections:
#
# 1. "Matriz Tecnológica" (displayed to the user as "inputTable"):
#    - The field can be either a dictionary or a list.
#    - For each value that is 0 or missing, it generates a random float between 0.01 and 0.4.
#
# 2. "Estoque e Demanda" (user-visible as "Estoque e Demanda"):
#    - Located under the key "estoqueEDemanda". It may include the fields:
#         "estoque" (stock level) and "demanda" (demand).
#    - If these fields are missing or 0, they are filled with random integers between 1 and 9.
#
# 3. "Proposta" (modal window "Proposta"):
#    - Found under the key "proposta", and contains several fields:
#         - "limiteTrabalhadores": Effective worker limit for the proposal; random int between 50 and 500.
#         - "cargaHorariaDiaria": Daily working hours; random float between 0.5 and 4.
#         - "tempoProducaoUnidade": Production time per unit; random float between 0.1 and 0.5.
#         - "escalaSemanal": Weekly shift; random int between 1 and 3.
#         - "turnoNoturno": Boolean indicating night shift; assigned randomly if absent.
#
# 4. "Produção e Meta" (Production and Goal):
#    - For committees only (the key contains "Comitê"), a field "producaoMeta" exists as a list
#      of objects. Each object represents a product's production information with:
#         - "quantidadeProduzida": Produced Quantity.
#         - "quantidadeMeta": Goal Quantity.
#    - The rules enforced:
#         a) "quantidadeMeta" must be between 1000 and 1000000 and not equal to 0.
#         b) "quantidadeProduzida" must be less than "quantidadeMeta" and non-zero.
#         c) If the values are invalid (e.g., meta is 0, less than 1000, or not greater than produced),
#            new random values are generated (with produced quantity at least 200 and less than meta).
#
# 5. "Informações da Unidade" (Unit Information):
#    - Two fields are managed:
#         a) "limiteEfetivoTrabalhadores": Effective worker limit in the production unit.
#            It is filled with a random int between 50 and 500 if not already set.
#         b) "conselhoPopularAssociadoDeComiteOuTrabalhador": Associated Popular Council.
#            This field is populated with the name of a "Conselho Popular Distrital" randomly chosen
#            from the keys in the JSON that include that string.
#    - Additionally, for committees the user sees "conselhoPopularAssociadoDeConselhoPopular"
#      (which indicates the associated Popular Council for the council) should be set to an empty string.
#
# Note:
# - The script uses the relative path based on its location in the "scripts" folder to access data.json.
# - Random values are generated using Python's random module within the specified ranges.
# - The fields and conditions are named for clarity based on the user's specification.
# --------------------------------------------------------------------------------------

def random_float(min_val, max_val):
    return round(random.uniform(min_val, max_val), 2)

def random_int(min_val, max_val):
    return random.randint(min_val, max_val)

# Set up the path for data.json using relative directories.
current_dir = os.path.dirname(__file__)
data_path = os.path.join(current_dir, "..", "data", "data.json")

# Load the data from data.json.
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Define keys that are considered global and are not processed by this script.
global_keys = {
    "users", "products", "services", "sectors", "matrizTecnologica", 
    "demand", "optimization", "config"
}

# Build a list of keys that represent a "Conselho Popular Distrital".
# These keys are used to assign a value for the field "conselhoPopularAssociadoDeComiteOuTrabalhador".
conselho_popular_distrital_list = [key for key in data.keys() if "Conselho Popular Distrital" in key]

# Iterate over each key and value in the JSON data.
for key, committee in data.items():
    # Only process items that are dictionaries, not part of the global keys, and do not have "UUID" in the key.
    if isinstance(committee, dict) and key not in global_keys and "UUID" not in key:
        # 1. Process "Matriz Tecnológica" (field "inputTable")
        # Check if the field exists. It may be a dict or a list.
        if "inputTable" in committee:
            if isinstance(committee["inputTable"], dict):
                for prod, value in committee["inputTable"].items():
                    # If the value is 0 or falsy, assign a random float between 0.01 and 0.4.
                    if not value:
                        committee["inputTable"][prod] = round(random.uniform(0.00002, 0.02), 5);
            elif isinstance(committee["inputTable"], list):
                committee["inputTable"] = [round(random.uniform(0.00002, 0.02), 5) if not v else v
                                           for v in committee["inputTable"]]

        # 2. Process "Estoque e Demanda" (field "estoqueEDemanda")
        # The expected subfields are "estoque" (stock) and "demanda" (demand), both filled with a random int [1,9] if missing.
        if "estoqueEDemanda" in committee and isinstance(committee["estoqueEDemanda"], dict):
            ed = committee["estoqueEDemanda"]
            if not ed.get("estoque"):
                ed["estoque"] = random_int(1, 9)
            if not ed.get("demanda"):
                ed["demanda"] = random_int(1, 9)

        # 3. Process "Proposta" (proposal data for production)
        if "proposta" in committee and isinstance(committee["proposta"], dict):
            prop = committee["proposta"]
            # "limiteTrabalhadores": effective worker limit (range: 50 to 500)
            if not prop.get("limiteTrabalhadores"):
                prop["limiteTrabalhadores"] = random_int(50, 500)
            # "cargaHorariaDiaria": daily working hours (range: 0.5 to 4)
            if not prop.get("cargaHorariaDiaria"):
                prop["cargaHorariaDiaria"] = random_float(0.5, 4)
            # "tempoProducaoUnidade": production time per unit (range: 0.1 to 0.5)
            if not prop.get("tempoProducaoUnidade"):
                prop["tempoProducaoUnidade"] = random_float(0.1, 0.5)
            # "escalaSemanal": weekly shift (range: 1 to 3)
            if not prop.get("escalaSemanal"):
                prop["escalaSemanal"] = random_int(1, 3)
            # "turnoNoturno": night shift option (boolean, randomly assigned if not present)
            if "turnoNoturno" not in prop:
                prop["turnoNoturno"] = random.choice([True, False])
        
        # 4. Process "Produção e Meta" for committees
        # This section applies only to committees (the key includes "Comitê").
        # The field "producaoMeta" is expected to be a list of objects, each with:
        #   - "quantidadeProduzida": the produced quantity, and
        #   - "quantidadeMeta": the target production quantity.
        # Conditions:
        #   a) "quantidadeMeta" must be between 1000 and 1000000 and must not be 0.
        #   b) "quantidadeProduzida" must be less than "quantidadeMeta". If it's 0 or invalid, it's recalculated.
        if "Comitê" in key and "producaoMeta" in committee and isinstance(committee["producaoMeta"], list):
            for item in committee["producaoMeta"]:
                try:
                    prod_val = float(item.get("quantidadeProduzida", 0))
                except (ValueError, TypeError):
                    prod_val = 0
                try:
                    meta_val = float(item.get("quantidadeMeta", 0))
                except (ValueError, TypeError):
                    meta_val = 0
                # If meta is 0, less than 1000, or not greater than produced quantity, adjust both.
                if meta_val < 1000 or meta_val <= prod_val or meta_val == 0:
                    new_meta = random_int(1000, 1000000)  # Target production value
                    new_prod = random_int(200, new_meta - 1)  # Produced quantity must be less than target
                    item["quantidadeMeta"] = new_meta
                    item["quantidadeProduzida"] = new_prod
                else:
                    # If produced quantity is 0, fill it with a valid random integer less than meta.
                    if prod_val == 0:
                        new_prod = random_int(200, int(meta_val) - 1)
                        item["quantidadeProduzida"] = new_prod

        # 5. Process "Informações da Unidade" (Unit Information)
        # a) "limiteEfetivoTrabalhadores": Effective worker limit in the production unit, value between 50 and 500.
        if "limiteEfetivoTrabalhadores" in committee:
            if not committee["limiteEfetivoTrabalhadores"]:
                committee["limiteEfetivoTrabalhadores"] = random_int(50, 500)
        else:
            committee["limiteEfetivoTrabalhadores"] = random_int(50, 500)

        # b) "conselhoPopularAssociadoDeComiteOuTrabalhador": Associated Popular Council.
        # It is filled with a random name from the list of "Conselho Popular Distrital" keys.
        if "conselhoPopularAssociadoDeComiteOuTrabalhador" in committee:
            if not committee["conselhoPopularAssociadoDeComiteOuTrabalhador"]:
                if conselho_popular_distrital_list:
                    committee["conselhoPopularAssociadoDeComiteOuTrabalhador"] = random.choice(conselho_popular_distrital_list)
                else:
                    committee["conselhoPopularAssociadoDeComiteOuTrabalhador"] = "Desconhecido"
        else:
            if conselho_popular_distrital_list:
                committee["conselhoPopularAssociadoDeComiteOuTrabalhador"] = random.choice(conselho_popular_distrital_list)
            else:
                committee["conselhoPopularAssociadoDeComiteOuTrabalhador"] = "Desconhecido"

        # For committee records (keys containing "Comitê"), the field "conselhoPopularAssociadoDeConselhoPopular"
        # should be empty. This field likely represents the associated Popular Council for councils,
        # thus it's intentionally set to an empty string for committees.
        if "Comitê" in key:
            committee["conselhoPopularAssociadoDeConselhoPopular"] = ""
            
# Write the updated JSON data to complete_data.json in the data folder.
with open(os.path.join(current_dir, "..", "data", "complete_data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    
print("Arquivo 'complete_data.json' salvo com os dados atualizados para os Comitês e Informações da Unidade.")