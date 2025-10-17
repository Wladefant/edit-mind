import sys
import os
import json
import subprocess

def create_faces_data_from_folder(faces_directory=".faces", output_json_path="faces.json"):
    """
    Scans the specified faces directory, expecting subfolders named after individuals,
    collects image paths, and optionally saves this data to a JSON file.
    """
    faces_data = {}
    
    if not os.path.exists(faces_directory):
        print(f"Error: .faces directory not found at {faces_directory}", file=sys.stderr)
        return faces_data

    for person_name in os.listdir(faces_directory):
        person_folder_path = os.path.join(faces_directory, person_name)
        if os.path.isdir(person_folder_path):
            image_paths = []
            for filename in os.listdir(person_folder_path):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    relative_path = os.path.join(faces_directory, person_name, filename)
                    image_paths.append(relative_path.replace("\\", "/")) # Ensure forward slashes for consistency
            if image_paths:
                faces_data[person_name] = image_paths
    
    if faces_data:
        try:
            # Ensure the directory for the output_json_path exists if it's nested
            output_dir = os.path.dirname(output_json_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)

            with open(output_json_path, 'w') as f:
                json.dump(faces_data, f, indent=2)
            print(f"Successfully generated and saved faces data to {output_json_path}")
        except IOError as e:
            print(f"Error saving faces data to {output_json_path}: {e}", file=sys.stderr)
    else:
        print(f"No faces data found in '{faces_directory}' to save to '{output_json_path}'.")

    return faces_data

def batch_add_faces_from_folder(faces_directory=".faces", known_faces_file="known_faces.json", output_json_path="faces.json"):
    
    faces_data = create_faces_data_from_folder(faces_directory, output_json_path)

    if not faces_data:
        print("No faces data found in the .faces directory. Exiting.", file=sys.stderr)
        sys.exit(0)

    add_face_script = os.path.join(os.path.dirname(__file__), "add_face.py")
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    for name, image_paths in faces_data.items():
        print(f"\nProcessing faces for: {name}")
        for image_path in image_paths:
            print(f"  - Processing image: {image_path}")
            
            # Construct the absolute path to the image
            absolute_image_path = os.path.join(project_root, image_path) 
            
            if not os.path.exists(absolute_image_path):
                print(f"    - Warning: Image not found at {absolute_image_path}. Skipping.", file=sys.stderr)
                continue

            command = [
                sys.executable,
                add_face_script,
                name,
                absolute_image_path,
                os.path.join(project_root, known_faces_file)
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            try:
                output = json.loads(result.stdout)
                if output.get("status") == "success":
                    print(f"    - Success: {output.get('message', 'Face added successfully.')}")
                else:
                    print(f"    - Info: {output.get('message', 'Operation completed with info.')}")
            except json.JSONDecodeError:
                print(f"    - Error processing {image_path}. Could not parse output from add_face.py.")
                print(f"      Stdout: {result.stdout}")
                print(f"      Stderr: {result.stderr}")
            except Exception as e:
                print(f"    - An unexpected error occurred: {e}")
                print(f"      Stdout: {result.stdout}")
                f"      Stderr: {result.stderr}"


if __name__ == "__main__":
    print("Scanning .faces directory and saving data to faces.json, then adding faces...")
    batch_add_faces_from_folder(output_json_path="faces.json")