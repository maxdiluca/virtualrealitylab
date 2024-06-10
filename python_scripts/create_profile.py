"""
This script essentially just creates a basic profile for a student/staff. 
Further customisation can be made after the folder has been created.
"""

import os

image_src = "python_scripts/resources/avatar.jpg"  # Replace with the actual source path
base_dir = "content/authors"

def get_user_groups():
    groups = [
        "Researchers",
        "Research Assistants",
        "Collaborators",
        "Visitors",
        "Project Students",
        "Volunteer Research Assistants",
        "Alumni",
        
    ]
    
    print("Choose organisational groups by entering their corresponding numbers separated by commas:")
    for idx, group in enumerate(groups):
        print(f"{idx + 1}. {group}")
    
    choices = input("Enter your choices (e.g., 1,3,5): ")
    chosen_groups = [groups[int(choice) - 1] for choice in choices.split(",")]
    return chosen_groups

def create_md_file(content, file_path):
    with open(file_path, 'w') as file:
        file.write(content)
    print(f"Markdown file created at: {file_path}")

def copy_image(src, dest):
    if os.path.exists(src):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(src, 'rb') as fsrc, open(dest, 'wb') as fdest:
            fdest.write(fsrc.read())
        print(f"Image copied to: {dest}")
    else:
        print(f"Source image not found: {src}")

def main():
    while True:
        # Prompt user for details
        student_name = input("\nEnter the person's name: ")
        student_name_spaced = student_name.replace(" ", "_")
        role = input("\nEnter the course title or role: ")

        interests = []
        while True:
            interest = input("\nEnter an interest (or press Enter to finish): ")
            if not interest:
                break
            interests.append(f"  - {interest}")
        
        student_email = input("Enter the person's email: ")

        user_groups = get_user_groups()

        # Define the content of the MD file
        md_content = (
            "---\n"
            f"# Display name\ntitle: {student_name}\n\n"
            f"# Username (this should match the folder name)\nauthors:\n- {student_name_spaced}\n\n"
            f"superuser: false\n\n"
            f"# Role/position\nrole:  {role}\n\n"
            "organization:\n"
            "- name: University of Birmingham\n"
            "  url: \"https://www.birmingham.ac.uk/\"\n\n"
            "# education:\n"
            "#   courses:\n"
            "#     - course: \n"
            "#       institution:  \n" 
            "#       year: \n\n"
            "interests:\n"
            + '\n'.join(interests) + "\n\n"
            "social:\n"
            "- icon: link\n"
            "  icon_pack: fas\n"
            "  link: \n\n"
            f"email: \"{student_email}\"\n\n"
            "user_groups:\n"
            + '\n'.join([f"- {group}" for group in user_groups]) + "\n\n"
            "---\n\n"

            f"This is my biography!\n"
        )

        # Define the directory path for the user
        user_dir = os.path.join(base_dir, student_name_spaced)
        
        # Create the directory if it doesn't exist
        os.makedirs(user_dir, exist_ok=True)
        
        # Define the path for the new MD file
        file_path = os.path.join(user_dir, f"_index.md")

        # Create the Markdown file
        create_md_file(md_content, file_path)

        # Define source and destination paths for the image
        
        image_dest = os.path.join(user_dir, "avatar.jpg")

        # Copy the image to the user's directory
        copy_image(image_src, image_dest)

        print("\n\nNew Profiles will require the server to build again.")
        print("CTRL+C to quit")
        
if __name__ == "__main__":
    main()
    
