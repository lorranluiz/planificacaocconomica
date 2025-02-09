import json
import os

def print_table(data, headers):
    # Determine the width of each column based on header and data lengths
    col_widths = [len(header) for header in headers]
    for row in data:
        for idx, cell in enumerate(row):
            col_widths[idx] = max(col_widths[idx], len(str(cell)))
    
    # Create a formatter string for each row
    row_format = " | ".join(["{{:<{}}}".format(width) for width in col_widths])
    separator = "-+-".join(["-" * width for width in col_widths])
    
    # Print header, separator, then rows
    print(row_format.format(*headers))
    print(separator)
    for row in data:
        print(row_format.format(*row))

def adjust_user_type(base_type, pronoun):
    # Assume pronoun "F", "Feminino" indicam gênero feminino.
    if pronoun and pronoun.lower() in ["f", "feminino"]:
        if "Conselheiro" in base_type:
            return base_type.replace("Conselheiro", "Conselheira")
        elif "Trabalhador" in base_type:
            return base_type.replace("Trabalhador", "Trabalhadora")
    return base_type

def main():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    users = data.get("users", [])
    table_rows = []
    for user in users:
        name = user.get("name", "N/A")
        password = user.get("password", "N/A")
        pronoun = user.get("pronoun", "").strip()  # expected values: "F", "Feminino", etc.
        instance = user.get("instance", "")
        
        if "Trabalhador" in instance:
            base_type = "Trabalhador"
            location = "Conselho de Distribuição e Serviço Associado"
        elif "Conselho" in instance:
            base_type = "Conselheiro de Conselho"
            location = user.get("instancePrepositionJurisdictionUUID", "Desconhecido")
        elif "Comitê" in instance:
            base_type = "Conselheiro de Comitê"
            location = user.get("instancePrepositionJurisdictionUUID", "Desconhecido")
        else:
            base_type = "Desconhecido"
            location = "Desconhecido"
        
        user_type = adjust_user_type(base_type, pronoun)
        table_rows.append([user_type, name, password, location])
    
    # Agrupar na seguinte ordem: Conselheiro de Conselho, Conselheiro de Comitê e Trabalhador.
    order = {
        "Conselheiro de Conselho": 0,
        "Conselheira de Conselho": 0,
        "Conselheiro de Comitê": 1,
        "Conselheira de Comitê": 1,
        "Trabalhador": 2,
        "Trabalhadora": 2
    }
    table_rows.sort(key=lambda row: order.get(row[0], 99))
    
    headers = ["Type", "Name", "Password", "Location"]
    print_table(table_rows, headers)

if __name__ == "__main__":
    main()