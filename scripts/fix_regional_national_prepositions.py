import json
import os
from datetime import datetime
import shutil

def fix_regional_national_prepositions():
    """Updates prepositions for users with Regional National councils"""
    
    # Setup paths
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    backup_dir = os.path.join(current_dir, "..", "data", "backups")
    
    # Create backup directory if it doesn't exist
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    # Create backup
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = os.path.join(backup_dir, f"data_backup_{timestamp}.json")
    
    # Load data
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Create backup
    shutil.copy2(data_path, backup_path)
    
    # Update prepositions
    for user in data["users"]:
        council_name = user.get("instancePrepositionJurisdictionUUID", "")
        
        if "Conselho Popular Regional Nacional" in council_name:
            # Extract preposition after "Conselho Popular Regional Nacional "
            remaining = council_name.split("Conselho Popular Regional Nacional ")[1]
            preposition = remaining.split()[0].lower()
            
            # Update user's preposition
            user["preposition"] = preposition
            print(f"Updated user {user.get('username', 'N/A')}: {preposition}")
    
    # Save updated data
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nBackup saved to: {backup_path}")
    print("Regional National prepositions update completed!")

if __name__ == "__main__":
    fix_regional_national_prepositions()