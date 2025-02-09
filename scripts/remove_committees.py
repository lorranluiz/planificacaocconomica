import json
import os
import shutil
from datetime import datetime

# Setup paths for data and backups.
current_dir = os.path.dirname(__file__)
data_path = os.path.join(current_dir, "..", "data", "data.json")
backup_dir = os.path.join(current_dir, "..", "data", "backups")

# Load the JSON data from data.json.
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Determine committee keys for removal.
# A committee entry is identified by its key containing "Comitê"
# and NOT containing "UUID".
committee_keys = []
for key in list(data.keys()):
    if "Comitê" in key and "UUID" not in key:
        committee_keys.append(key)

# Remove the committee entries.
for key in committee_keys:
    del data[key]
    print(f"Removed committee: {key}")

# Remove users associated with removed committees.
if "users" in data and isinstance(data["users"], list):
    original_count = len(data["users"])
    data["users"] = [
        user for user in data["users"]
        if user.get("instancePrepositionJurisdictionUUID", "").strip() not in committee_keys
    ]
    removed_users_count = original_count - len(data["users"])
    print(f"Removed {removed_users_count} user(s) associated with committees.")

# Backup the current data.json before writing changes.
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)
timestamp = datetime.now().strftime("%S%M%H%d%m%Y")
backup_filename = f"dataBackup{timestamp}.json"
backup_path = os.path.join(backup_dir, backup_filename)
shutil.copy2(data_path, backup_path)
print(f"Backup of original data.json created at '{backup_path}'.")

# Write the updated data back to data.json.
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("All committees and their associated users have been removed from data.json.")