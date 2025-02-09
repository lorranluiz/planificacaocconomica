import os
import json

def adjust_user_type(base_type, pronoun):
    # Adjust user type based on pronoun ("feminino" indicates female).
    # For example, "Conselheiro" becomes "Conselheira" and "Trabalhador" becomes "Trabalhadora".
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
    
    # Retrieve the list of users from the data file.
    users = data.get("users", [])
    table_rows = []
    
    # Header explanation:
    # For users identified as "Trabalhador/Trabalhadora" (their instancePrepositionJurisdictionUUID contains "UUID"),
    # the corresponding committee entry in the data is looked up using the value of instancePrepositionJurisdictionUUID as key.
    # Then, for the "Local" column in the table:
    #   1. The primary location value is taken from the committee's "conselhoPopularAssociadoDeComiteOuTrabalhador" field.
    #   2. The secondary location value is taken from the committee's "associacaoDeMoradoresAssociadaDeTrabalhador" field.
    # These two values are displayed on separate lines in the same cell.
    # For other users (those whose instancePrepositionJurisdictionUUID does not contain "UUID"),
    # the entire instancePrepositionJurisdictionUUID is used as the location.
    header = ["Tipo", "Username (login)", "Senha", "Local"]
    table_rows.append(header)
    
    for user in users:
        instance = user.get("instancePrepositionJurisdictionUUID", "")
        pronoun = user.get("pronoun", "")
        password = user.get("password", "")
        username = user.get("username", "")
        
        if "UUID" in instance:
            base_type = "Trabalhador"
            # For workers, look up the committee entry with key equal to the user's instancePrepositionJurisdictionUUID.
            # Then retrieve:
            # - "conselhoPopularAssociadoDeComiteOuTrabalhador" as the primary location.
            # - "associacaoDeMoradoresAssociadaDeTrabalhador" as the secondary location.
            committee = data.get(instance, {})
            primary_location = committee.get("conselhoPopularAssociadoDeComiteOuTrabalhador", instance)
            secondary_location = committee.get("associacaoDeMoradoresAssociadaDeTrabalhador", "")
            if secondary_location:
                location = f"{primary_location}\n{secondary_location}"
            else:
                location = primary_location
        elif "Conselho" in instance:
            base_type = "Conselheiro de Conselho"
            location = instance
        elif "Comitê" in instance:
            base_type = "Conselheiro de Comitê"
            location = instance
        else:
            base_type = "Desconhecido"
            location = "Desconhecido"
        
        user_type = adjust_user_type(base_type, pronoun)
        table_rows.append([user_type, username, password, location])
    
    # Order rows: Conselheiro de Conselho, Conselheiro de Comitê, Trabalhador/Trabalhadora, then Desconhecido.
    order = {
        "Conselheiro de Conselho": 0,
        "Conselheira de Conselho": 0,
        "Conselheiro de Comitê": 1,
        "Conselheira de Comitê": 1,
        "Trabalhador": 2,
        "Trabalhadora": 2,
        "Desconhecido": 3
    }
    header_row = table_rows[0]
    data_rows = table_rows[1:]
    data_rows.sort(key=lambda row: order.get(row[0], 99))
    table_rows = [header_row] + data_rows
    
    # Compute column widths for proper formatting (handling multiple lines in a cell).
    num_cols = len(header)
    col_widths = []
    for col in range(num_cols):
        max_width = 0
        for row in table_rows:
            # Split cell content by newline to account for multiple lines.
            cell_lines = str(row[col]).split("\n")
            cell_max = max(len(line) for line in cell_lines)
            if cell_max > max_width:
                max_width = cell_max
        col_widths.append(max_width + 2)  # add padding
    
    # Create a separator row based on column widths.
    sep = "+" + "+".join("-" * width for width in col_widths) + "+"
    
    # Print the table with borders.
    print(sep)
    # Print header row (centered).
    header_formatted = "|" + "|".join(str(header_row[i]).center(col_widths[i]) for i in range(num_cols)) + "|"
    print(header_formatted)
    print(sep)
    # Print each data row, handling multi-line cells.
    for row in data_rows:
        # Split each cell into lines.
        cell_lines = [str(row[i]).split("\n") for i in range(num_cols)]
        max_lines = max(len(cell) for cell in cell_lines)
        for line in range(max_lines):
            line_cells = []
            for i in range(num_cols):
                # If there is no line in the cell, use an empty string.
                content = cell_lines[i][line] if line < len(cell_lines[i]) else ""
                line_cells.append(content.ljust(col_widths[i]))
            print("|" + "|".join(line_cells) + "|")
        print(sep)

if __name__ == "__main__":
    main()