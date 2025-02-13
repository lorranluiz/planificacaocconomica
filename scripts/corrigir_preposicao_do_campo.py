import json
import os

def replace_de_do_in_file(file_path):
    # Load data
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Convert data to string
    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    
    # Replace occurrences
    data_str = data_str.replace(" de do", " do")
    
    # Convert string back to JSON
    data = json.loads(data_str)
    
    # Save updated data
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Replaced all occurrences of ' de do' with ' do' in {file_path}")

if __name__ == "__main__":
    # Setup paths
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    
    replace_de_do_in_file(data_path)