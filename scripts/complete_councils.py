import json
import os

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

# Iterate over each key and value in the JSON data.
for key, council in data.items():
    # Process only if the value is a dict, the key is not global, and doesn't include "UUID".
    if isinstance(council, dict) and key not in global_keys and "UUID" not in key:
        # Identify councils: key contains "Conselho" but does NOT contain "Comitê".
        if "Conselho" in key and "Comitê" not in key:
            # For councils, ensure the field "conselhoPopularAssociadoDeComiteOuTrabalhador" is empty,
            # since that field is reserved for Comitês.
            council["conselhoPopularAssociadoDeComiteOuTrabalhador"] = ""

# Write the updated JSON data to complete_data.json in the data folder.
with open(os.path.join(current_dir, "..", "data", "complete_data.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Arquivo 'complete_data.json' atualizado: campos 'conselhoPopularAssociadoDeComiteOuTrabalhador' em conselhos foram zerados.")