import json
import os

def load_data():
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def is_council(key, obj):
    """
    Identify councils based on:
     - The key contains "Conselho" (indicating council)
     - The key does NOT contain "Comitê" (to exclude committees)
    Additionally, we assume the object is a dictionary.
    """
    return isinstance(obj, dict) and "Conselho" in key and "Comitê" not in key

def build_council_tree(data):
    # Build a dict mapping council names to nodes.
    councils = {}
    for key, obj in data.items():
        if is_council(key, obj):
            councils[key] = {"name": key, "children": [], 
                             "parentName": obj.get("conselhoPopularAssociadoDeConselhoPopular", "").strip()}
    roots = []
    # Connect councils based on their parent fields.
    for name, node in councils.items():
        parent_name = node["parentName"]
        if parent_name and parent_name in councils:
            councils[parent_name]["children"].append(node)
        else:
            roots.append(node)
    # Sort children alphabetically for consistency.
    def sort_children(node):
        node["children"].sort(key=lambda child: child["name"])
        for child in node["children"]:
            sort_children(child)
    for root in roots:
        sort_children(root)
    return roots

def print_tree_node(node, prefix="", is_last=True):
    # Prepare the connector symbol.
    connector = "└── " if is_last else "├── "
    print(prefix + connector + node["name"])
    children = node.get("children", [])
    child_count = len(children)
    for index, child in enumerate(children):
        next_is_last = (index == child_count - 1)
        next_prefix = prefix + ("    " if is_last else "│   ")
        print_tree_node(child, next_prefix, next_is_last)

def print_tree(roots):
    # Print each root; for multiple roots there's no connector.
    for index, root in enumerate(roots):
        print(root["name"])
        child_count = len(root.get("children", []))
        for idx, child in enumerate(root.get("children", [])):
            next_is_last = (idx == child_count - 1)
            print_tree_node(child, "", next_is_last)
            
def main():
    data = load_data()
    council_roots = build_council_tree(data)
    print("Council Tree (based on 'conselhoPopularAssociadoDeConselhoPopular'):")
    print_tree(council_roots)

if __name__ == "__main__":
    main()