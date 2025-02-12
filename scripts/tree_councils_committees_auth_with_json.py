import json
import os
from colorama import init, Fore, Style
from datetime import datetime

def load_data():
    """Load data from data.json"""
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_user_credentials(data, entity_name):
    """Get username and password for entity from users list"""
    users = data.get("users", [])
    for user in users:
        jurisdiction = user.get("instancePrepositionJurisdictionUUID", "")
        if jurisdiction == entity_name:
            username = user.get("username", "")
            password = user.get("password", "")
            if username and password:
                return username, password
    return None, None

def build_tree(data):
    """Build tree structure from data"""
    # Create nodes for each entity
    nodes = {}
    for name, entity in data.items():
        if isinstance(entity, dict):
            nodes[name] = {
                "name": name,
                "children": [],
                "parent": entity.get("conselhoPopularAssociadoDeConselhoPopular", "")
            }
    
    # Build tree relationships
    roots = []
    for name, node in nodes.items():
        parent_name = node["parent"]
        if parent_name:
            if parent_name in nodes:
                nodes[parent_name]["children"].append(node)
        else:
            roots.append(node)
    
    return roots

def print_tree(nodes, prefix=""):
    """Print tree structure with authentication info"""
    for i, node in enumerate(nodes):
        is_last = i == len(nodes) - 1
        current_prefix = "└── " if is_last else "├── "
        
        # Get authentication info
        username, password = get_user_credentials(data, node["name"])
        auth_info = f"( {username} | {password} )" if username and password else ""
        
        # Print node
        print(f"{prefix}{current_prefix}{node['name']} {auth_info} [Council]")
        
        # Print children
        child_prefix = prefix + ("    " if is_last else "│   ")
        print_tree(node["children"], child_prefix)

def clean_name(name):
    """Remove standard prefixes from council names"""
    prefixes = [
        "Conselho Popular Intercontinental da ",
        "Conselho Popular Continental da ",
        "Conselho Popular Regional Continental da ",
        "Conselho Popular Regional Continental do ",
        "Conselho Popular Nacional da ",
        "Conselho Popular Nacional do ",
        "Conselho Popular Nacional dos ",
        "Conselho Popular Regional Nacional da ",
        "Conselho Popular Regional Nacional do ",
        "Conselho Popular Regional Nacional dos "
    ]
    
    for prefix in prefixes:
        if name.startswith(prefix):
            return name[len(prefix):]
    return name

def build_json_tree(nodes):
    """Build JSON tree structure from nodes"""
    tree = {}
    
    def add_to_tree(node, current_dict):
        clean_node_name = clean_name(node["name"])
        
        if not node["children"]:
            current_dict[clean_node_name] = ["pais1", "pais2"]
            return
            
        current_dict[clean_node_name] = {}
        for child in node["children"]:
            add_to_tree(child, current_dict[clean_node_name])
    
    for root in nodes:
        add_to_tree(root, tree)
    
    return tree

def save_json_tree(tree):
    """Save tree structure to timestamped JSON file"""
    current_dir = os.path.dirname(__file__)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"regioes{timestamp}.json"
    filepath = os.path.join(current_dir, "..", "data", filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
    
    print(f"\nJSON tree structure saved to: {filepath}")

def main():
    init()
    global data
    data = load_data()
    tree_roots = build_tree(data)
    
    # Print tree structure
    print("Tree of Councils and Committees with Auth Info:")
    print_tree(tree_roots)
    
    # Generate and save JSON tree
    json_tree = build_json_tree(tree_roots)
    save_json_tree(json_tree)

if __name__ == "__main__":
    main()