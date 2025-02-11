import json
import os
from colorama import init, Fore, Style

def load_data():
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
                return f"( {username} | {password} )"
    return "(no auth)"

def is_council(key, obj):
    return isinstance(obj, dict) and "Conselho" in key and "Comitê" not in key

def is_committee(key, obj):
    return isinstance(obj, dict) and "Comitê" in key

def build_tree(data):
    nodes = {}
    global_keys = {"users", "products", "services"}
    
    for key, obj in data.items():
        if not isinstance(obj, dict) or key in global_keys or "UUID" in key:
            continue

        if is_council(key, obj):
            parent = obj.get("conselhoPopularAssociadoDeConselhoPopular", "")
            node_type = "Council"
        elif is_committee(key, obj):
            parent = obj.get("conselhoPopularAssociadoDeComiteOuTrabalhador", "")
            node_type = "Committee"
        else:
            continue

        nodes[key] = {
            "name": key,
            "type": node_type,
            "parentName": parent,
            "children": [],
            "auth": get_user_credentials(data, key)
        }

    roots = []
    for name, node in nodes.items():
        parent_name = node["parentName"]
        if parent_name and parent_name in nodes:
            nodes[parent_name]["children"].append(node)
        else:
            roots.append(node)

    def sort_children(node):
        node["children"].sort(key=lambda x: x["name"])
        for child in node["children"]:
            sort_children(child)

    for root in roots:
        sort_children(root)
    
    return sorted(roots, key=lambda x: x["name"])

def color_for_node(node_type, level, max_level):
    if node_type == "Committee":
        return "\033[38;2;255;255;255m"  # White for committees
    
    # Gradient only for councils
    fraction = level / max_level if max_level > 0 else 0
    r = 255  # Keep red at max
    g = b = int(255 * fraction)  # Increase green/blue with depth
    return f"\033[38;2;{r};{g};{b}m"

# ...existing code...

def print_tree_node(node, prefix="", is_last=True, level=0, max_level=0, parent_color=None):
    connector = "└── " if is_last else "├── "
    node_color = color_for_node(node["type"], level, max_level)
    reset = "\033[0m"
    effective_prefix = f"{parent_color}{prefix}{reset}" if parent_color else prefix
    
    print(f"{effective_prefix}{connector}{node_color}{node['name']} {node['auth']} [{node['type']}]{reset}")
    
    branch = "    " if is_last else "│   "
    next_prefix = prefix + branch
    
    children = sorted(node["children"], key=lambda x: x["name"])
    for i, child in enumerate(children):
        is_last_child = (i == len(children) - 1)
        print_tree_node(child, next_prefix, is_last_child, level + 1, max_level, node_color)

def find_max_depth(nodes, current_depth=0):
    if not nodes:
        return current_depth
    return max(find_max_depth(node["children"], current_depth + 1) for node in nodes)

def print_tree(roots):
    max_level = find_max_depth(roots)
    for i, root in enumerate(roots):
        root_color = color_for_node(root["type"], 0, max_level)
        reset = "\033[0m"
        print(f"{root_color}{root['name']} {root['auth']} [{root['type']}]{reset}")
        
        for j, child in enumerate(root["children"]):
            is_last = (j == len(root["children"]) - 1)
            print_tree_node(child, "", is_last, 1, max_level, root_color)

def main():
    init()
    data = load_data()
    tree_roots = build_tree(data)
    print("Tree of Councils and Committees with Auth Info:")
    print_tree(tree_roots)

if __name__ == "__main__":
    main()