import os
import shutil
from datetime import datetime

def restore_latest_backup():
    # Setup paths
    current_dir = os.path.dirname(__file__)
    data_path = os.path.join(current_dir, "..", "data", "data.json")
    backup_dir = os.path.join(current_dir, "..", "data", "backups")

    # Check if backup directory exists
    if not os.path.exists(backup_dir):
        print("Backup directory does not exist!")
        return

    # Find all backup files
    backup_files = [f for f in os.listdir(backup_dir) if f.startswith("data_backup_") and f.endswith(".json")]
    
    if not backup_files:
        print("No backup files found!")
        return

    # Sort backup files by timestamp in descending order
    backup_files.sort(reverse=True, key=lambda x: datetime.strptime(x, "data_backup_%Y%m%d%H%M%S.json"))

    # Get the latest backup file
    latest_backup = backup_files[0]
    latest_backup_path = os.path.join(backup_dir, latest_backup)

    # Restore the latest backup
    shutil.copy2(latest_backup_path, data_path)
    print(f"Restored {data_path} from {latest_backup_path}")

if __name__ == "__main__":
    restore_latest_backup()