import json
import os

# --------------------------------------------------------------------------------------
# This script builds and prints a colorized tree structure that includes both "Councils"
# and "Committees". The data is loaded from a JSON file where each entry represents an
# entity (a council, committee, or other entity such as a user). The identification is
# based on the key names and specific fields:
#
# - Councils:
#    * The key contains "Conselho" and does not contain "Comitê".
#    * The council's parent (if any) is stored in the field "conselhoPopularAssociadoDeConselhoPopular".
#
# - Committees:
#    * The key contains "Comitê".
#    * The committee's parent (if any) is stored in the field "conselhoPopularAssociadoDeComiteOuTrabalhador".
#
# The tree is printed with a color gradient. The branches and node texts are colored:
#   - The parent's color is used on the branch lines.
#   - The color for each node is determined based on its level (depth)
#     with a gradient from pure red at the top (level 0) to white at the lowest level.
#   - Committees always display as pure red.
#
# This detailed commentary and inline comments are provided so that an AI or other
# developer can easily understand the data fields, tree structure, and how the colorization
# works.
# --------------------------------------------------------------------------------------

def load_data():
    """
    Load JSON data from a file located in the relative directory ../data/data.json.
    Returns the parsed JSON as a Python dictionary.
    """
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)

def is_council(key, obj):
    """
    Determine if an entry is a Council.
    Conditions:
      - The key contains the string "Conselho".
      - The key does NOT contain the string "Comitê".
      - The object must be a dictionary.
    """
    return isinstance(obj, dict) and "Conselho" in key and "Comitê" not in key

def is_committee(key, obj):
    """
    Determine if an entry is a Committee.
    Conditions:
      - The key contains the string "Comitê".
      - The object must be a dictionary.
    """
    return isinstance(obj, dict) and "Comitê" in key

def build_tree(data):
    """
    Build a tree that includes both councils and committees.
    For each entry:
      - For councils, the parent's name is obtained from the field 
        "conselhoPopularAssociadoDeConselhoPopular".
      - For committees, the parent's name is obtained from the field 
        "conselhoPopularAssociadoDeComiteOuTrabalhador".
      - If an entry's parent is not found or the parent's field is empty,
        the entry becomes a root.
    The tree is stored as nested dictionaries with each node having:
      - 'name': the key (name of the entity)
      - 'type': either "Council" or "Committee"
      - 'parentName': the parent's name (if exists)
      - 'children': a list of child nodes
    """
    nodes = {}
    # Define keys that represent global settings or non-entity entries (to skip)
    global_keys = {"users", "products", "services", "sectors", "matrizTecnologica",
                   "demand", "optimization", "config"}
    for key, obj in data.items():
        # Only process if the object is a dictionary, key is not global, and key does not contain "UUID"
        if not (isinstance(obj, dict) and key not in global_keys and "UUID" not in key):
            continue

        # Identify if the entity is a Council or Committee based on its key and attributes.
        if is_council(key, obj):
            # For a Council, the parent's name is stored in "conselhoPopularAssociadoDeConselhoPopular"
            parent = obj.get("conselhoPopularAssociadoDeConselhoPopular", "").strip()
            node_type = "Council"
        elif is_committee(key, obj):
            # For a Committee, the parent's name is stored in "conselhoPopularAssociadoDeComiteOuTrabalhador"
            parent = obj.get("conselhoPopularAssociadoDeComiteOuTrabalhador", "").strip()
            node_type = "Committee"
        else:
            # Skip any entry that is not a council or committee
            continue

        nodes[key] = {
            "name": key,          # The name of the node (as given by the key)
            "type": node_type,    # "Council" or "Committee"
            "parentName": parent, # Name of the parent node, if any
            "children": []        # List to store child nodes
        }

    roots = []
    # Connect each node to its parent based on the parentName field.
    for name, node in nodes.items():
        parent_name = node["parentName"]
        if parent_name and parent_name in nodes:
            nodes[parent_name]["children"].append(node)
        else:
            # If no valid parent is identified, the node is a root.
            roots.append(node)

    def sort_children(node):
        """
        Recursively sort the children list of a node alphabetically by node name.
        """
        node["children"].sort(key=lambda child: child["name"])
        for child in node["children"]:
            sort_children(child)
    for root in roots:
        sort_children(root)

    return roots

def find_max_depth(nodes, current_depth=0):
    """
    Recursively find the maximum depth (level) in the tree.
    Returns the deepest level found.
    """
    max_depth = current_depth
    for node in nodes:
        if node["children"]:
            depth = find_max_depth(node["children"], current_depth + 1)
            max_depth = max(max_depth, depth)
        else:
            max_depth = max(max_depth, current_depth)
    return max_depth

def color_for_node(node_type, level, max_level):
    """
    Determine the ANSI color code for a node based on its level and type.
    - For a node at the lowest level (level == max_level), return white (RGB 255,255,255).
    - For a Committee (regardless of level, except lowest), always return pure red (RGB 255,0,0).
    - For a Council, produce a gradient:
          fraction = level / max_level (determines progress from top to bottom)
          Color = (R, G, B) where R is fixed at 255 and G, B scale from 0 (pure red) to 255 (white).
    """
    if level == max_level:
        return "\033[38;2;255;255;255m"  # white for the lowest level nodes
    else:
        if node_type == "Committee":
            return "\033[38;2;255;0;0m"      # pure red for committees
        else:
            fraction = (level / max_level) if max_level > 0 else 0
            r = 255
            g = int(255 * fraction)
            b = int(255 * fraction)
            return f"\033[38;2;{r};{g};{b}m"

def print_tree_node(node, prefix="", is_last=True, level=0, max_level=0, parent_color=None):
    """
    Print a single node and its subtree recursively.
    Parameters:
      - prefix: String used for indenting branch lines.
      - is_last: Boolean indicating if the node is the last child of its parent (affects branch drawing).
      - level: Current node level (depth) in the tree.
      - max_level: Maximum depth of the entire tree (used for color gradient calculation).
      - parent_color: ANSI color code of the parent node, used to color the branch lines.
    The parent's branch color is applied if provided so that the branch lines match the parent's color.
    """
    connector = "└── " if is_last else "├── "
    # Determine the ANSI color for this node based on its type and level.
    node_color = color_for_node(node["type"], level, max_level)
    reset = "\033[0m"
    # Apply parent's color to the prefix (branch lines) if available.
    effective_prefix = (f"{parent_color}{prefix}{reset}" if parent_color else prefix)
    print(effective_prefix + connector + node_color + f"{node['name']} [{node['type']}]" + reset)
    # Determine the branch character for subsequent lines.
    branch = "    " if is_last else "│   "
    next_prefix = prefix + branch
    children = node.get("children", [])
    count = len(children)
    for idx, child in enumerate(children):
        next_is_last = (idx == count - 1)
        # For child nodes, pass the current node's color as the parent's color.
        print_tree_node(child, next_prefix, next_is_last, level + 1, max_level, parent_color=node_color)

def print_tree(roots):
    """
    Print the full tree starting from the root nodes.
    First, find the maximum depth of the tree.
    Then, for each root, print its name and recursively print its children.
    """
    max_level = find_max_depth(roots)
    for root in roots:
        # Determine the color for the root node (level 0).
        root_color = color_for_node(root["type"], 0, max_level)
        reset = "\033[0m"
        print(root_color + f"{root['name']} [{root['type']}]" + reset)
        count = len(root.get("children", []))
        for idx, child in enumerate(root.get("children", [])):
            next_is_last = (idx == count - 1)
            print_tree_node(child, "", next_is_last, 1, max_level, parent_color=root_color)

def main():
    """
    Main function:
      - Loads the JSON data.
      - Builds the tree structure for both councils and committees.
      - Prints the tree to the terminal with colored text and branch lines.
    """
    data = load_data()
    tree_roots = build_tree(data)
    print("Tree of Councils and Committees (branch lines in parent's color; lowest nodes in white):")
    print_tree(tree_roots)

if __name__ == "__main__":
    main()