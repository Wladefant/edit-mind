import sys
import os
import json
import face_recognition

def add_face(name, image_path, known_faces_file):
    """
    Extracts a face encoding from an image and adds it to the known faces file.
    """
    if not os.path.exists(image_path):
        print(json.dumps({"status": "error", "message": "Image file not found."}))
        sys.exit(1)

    try:
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)

        if len(face_encodings) == 0:
            print(json.dumps({"status": "error", "message": "No face found in the image."}))
            sys.exit(1)
        
        if len(face_encodings) > 1:
            print(json.dumps({"status": "warning", "message": "Multiple faces found. Using the first one."}))

        new_encoding = face_encodings[0].tolist()

        known_faces = {}
        if os.path.exists(known_faces_file):
            with open(known_faces_file, 'r') as f:
                known_faces = json.load(f)
        
        if name in known_faces:
            known_faces[name].append(new_encoding)
        else:
            known_faces[name] = [new_encoding]

        with open(known_faces_file, 'w') as f:
            json.dump(known_faces, f, indent=2)
        
        print(json.dumps({"status": "success", "message": f"Face for {name} added successfully."}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python add_face.py <name> <image_path> <known_faces_file>", file=sys.stderr)
        sys.exit(1)
    
    name = sys.argv[1]
    image_path = sys.argv[2]
    known_faces_file = sys.argv[3]
    add_face(name, image_path, known_faces_file)
