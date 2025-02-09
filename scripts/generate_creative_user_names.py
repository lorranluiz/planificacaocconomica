import json
import os
import random

current_dir = os.path.dirname(__file__)
data_path = os.path.join(current_dir, "..", "data", "data.json")
output_path = os.path.join(current_dir, "..", "data", "updated_data.json")

first_names = [
    "Aurora", "Luna", "Gael", "Ravi", "Elena", "Enzo",
    "Leo", "Maya", "Zara", "Nina", "Alex", "Eden"
]
last_names = [
    "Silva", "Souza", "Costa", "Dias", "Pereira", "Oliveira",
    "Martins", "Gomes", "Lima", "Ribeiro", "Ferreira", "Alves"
]
conjunctions = ["e", "de"]

def generate_creative_name():
    # With 50% chance, create a compound name with conjunction, otherwise a simple two-word name.
    if random.choice([True, False]):
        # Compound name: <first_name> + ' ' + <conjunction> + ' ' + <first_name>
        name = f"{random.choice(first_names)} {random.choice(conjunctions)} {random.choice(first_names)}"
    else:
        # Simple name: <first_name> + ' ' + <last_name>
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
    return name

with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

users = data.get("users", [])
updated = False

for user in users:
    # Verifica se o campo "name" não existe ou é vazio
    if not user.get("name"):
        user["name"] = generate_creative_name()
        updated = True

if updated:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Usuários atualizados com nomes criativos. Arquivo salvo em '{output_path}'.")
else:
    print("Nenhum usuário sem nome encontrado.")