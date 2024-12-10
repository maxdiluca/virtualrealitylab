import pandas as pd
import os
import shutil
from datetime import datetime

def generate_md(name, role):
    md_template = f"""
---
# {name}
title: {name}

# Is this the primary user of the site?
superuser: false

# Username (this should match the folder name)
authors: {name.replace(' ', '_')}

# Role/position
role: {role}

# Organizations/Affiliations
organizations:
  - name: University of Birmingham
    url: "https://www.birmingham.ac.uk/"

interests:
  # - Interest 1
  # - Interest 2

education:
  course: Course Title
  institution: University Name
    

social:
  # - icon: 
  #   icon_pack:
  #   link:

highlight_name: false

user_groups:
  # - Group 1
  # - Group 2

# User Groups:
# Researchers (R)
# Research Assistants (RA)
# Collaborators (C)
# Visitors (V)
# Project Students (P)
# Volunteer Research Assistants (V)
# Alumni (A)
---
    """
    return md_template.strip()

def create_md_file(row, output_dir, avatar_path):
    name = row['Name']
    role = row['Primary Role']

    user_group_prefix = {
        'Researcher': 'R',
        'Research Assistant': 'RA',
        'Collaborator': 'C',
        'Visitor': 'V',
        'Project student': 'P',
        'Volunteer Research Assistant': 'V',
        'Alumni': 'A'
    }
    
    # Get the prefix for the user group based on the Primary Role (default to empty string if not found)
    prefix = user_group_prefix.get(role, '')
    print(prefix)
    
    # Generate the md content
    md_content = generate_md(name, role)
    
    folder_name = f"{prefix}_{name.replace(' ', '_')}" if prefix else f"{name.replace(' ', '_')}"
    user_folder_path = os.path.join(output_dir, folder_name)
    os.makedirs(user_folder_path, exist_ok=True)
    
    file_path = os.path.join(user_folder_path, f"_index.md")
    
    with open(file_path, 'w') as md_file:
        md_file.write(md_content)
    print(f"Generated markdown for {name} at {file_path}")
    
    avatar_dest = os.path.join(user_folder_path, 'avatar.png')
    shutil.copy(avatar_path, avatar_dest)
    print(f"Copied avatar.png to {user_folder_path}")

# Read the Excel file
excel_file = "python_scripts\VR Lab Induction 1.xlsx"
output_directory = "python_scripts\output"
avatar_path = "python_scripts/resources/avatar.png"

df = pd.read_excel(excel_file)
os.makedirs(output_directory, exist_ok=True)


threshold_date = datetime(2024, 12, 11) # datetime(YYY, MM, DD)

# Ensure that the 'Date' column is in datetime format
df['Date'] = pd.to_datetime(df['Completion time'], errors='coerce')

for index, row in df.iterrows():
    if row['Date'] >= threshold_date:
        create_md_file(row, output_directory, avatar_path)
