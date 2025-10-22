import sys
import os
import json
import face_recognition

def add_face(name, image_path, known_faces_file):
    """
    Extracts a face encoding from an image and adds it to the known faces file.
    """
    if not os.path.exists(image_path):
        print(json.dumps({"status": "error", "message": "Image file not found."}), file=sys.stderr)
        sys.exit(1)

    try:
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)

        if len(face_encodings) == 0:
            print(json.dumps({"status": "warning", "message": "No face detected in image."}), file=sys.stderr)
            sys.exit(0)  # Not an error, just no face found

        if len(face_encodings) > 1:
            print(json.dumps({"status": "warning", "message": "Multiple faces found. Using the first one."}), file=sys.stderr)

        new_encoding = face_encodings[0].tolist()

        # Load existing known faces
        known_faces = []
        if os.path.exists(known_faces_file):
            try:
                with open(known_faces_file, 'r') as f:
                    content = f.read().strip()
                    if content:  # Only parse if file is not empty
                        known_faces = json.load(open(known_faces_file, 'r'))
                    else:
                        known_faces = []
            except json.JSONDecodeError as e:
                print(json.dumps({
                    "status": "error", 
                    "message": f"Corrupted known_faces.json: {e.msg} at line {e.lineno}"
                }), file=sys.stderr)
                sys.exit(1)
        
        # Add new face encoding in the format expected by FaceRecognizer
        # Format: [{"name": "Person Name", "encoding": [...]}, ...]
        known_faces.append({
            "name": name,
            "encoding": new_encoding
        })

        # Write back to file with proper formatting
        with open(known_faces_file, 'w') as f:
            json.dump(known_faces, f, indent=2)
        
        print(json.dumps({
            "status": "success", 
            "message": f"Face for {name} added successfully.",
            "total_encodings": len(known_faces)
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "status": "error", 
            "message": f"Error processing image: {str(e)}"
        }), file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python add_face.py <name> <image_path> <known_faces_file>"
        }), file=sys.stderr)
        sys.exit(1)
    
    name = sys.argv[1]
    image_path = sys.argv[2]
    known_faces_file = sys.argv[3]
    add_face(name, image_path, known_faces_file)