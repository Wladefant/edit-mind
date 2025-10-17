import face_recognition
import numpy as np
import json
import os
import sys

class FaceRecognizer:
    def __init__(self, known_faces_file='faces.json', tolerance=0.5, model='cnn'):
        """
        Initialize the face recognizer.
        
        Args:
            known_faces_file: Path to JSON file storing known faces
            tolerance: Lower is more strict (default 0.6, range 0.0-1.0)
            model: 'cnn' for accuracy or 'hog' for speed
        """
        self.known_faces_file = known_faces_file
        self.tolerance = tolerance
        self.model = model
        self.known_face_encodings = []
        self.known_face_names = []
        self.load_known_faces()
    def reload_known_faces(self):
            """Explicitly reloads known faces from the file."""
            self._load_known_faces()
            
    def load_known_faces(self):
        print(f"Attempting to load known faces from: {self.known_faces_file}", file=sys.stderr)
        if os.path.exists(self.known_faces_file):
            with open(self.known_faces_file, 'r') as f:
                known_faces_data = json.load(f)
                for name, encodings in known_faces_data.items():
                    for encoding in encodings:
                        self.known_face_encodings.append(np.array(encoding))
                        self.known_face_names.append(name)
            print(f"Loaded {len(self.known_face_names)} known face encodings.", file=sys.stderr)
        else:
            print("Warning: known_faces.json not found.", file=sys.stderr)

    def recognize_faces(self, frame, upsample=1):
        """
        Recognize faces in a frame with improved accuracy.
        
        Args:
            frame: Image array (RGB format recommended)
            upsample: Number of times to upsample image for detection (higher = more accurate but slower)
        """
        # Convert to RGB if needed (face_recognition uses RGB)
        if len(frame.shape) == 2:  # Grayscale
            frame = np.stack([frame] * 3, axis=-1)
        
        # Detect faces with upsampling for better detection
        face_locations = face_recognition.face_locations(
            frame, 
            number_of_times_to_upsample=upsample,
            model=self.model
        )
        
        # Get 128-dimensional face encodings
        face_encodings = face_recognition.face_encodings(
            frame, 
            face_locations,
            num_jitters=10  # More jitters = more accurate but slower
        )

        recognized_faces = []
        for face_location, face_encoding in zip(face_locations, face_encodings):
            name = "Unknown"
            confidence = 0.0

            if len(self.known_face_encodings) > 0:
                # Calculate distances to all known faces
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings, 
                    face_encoding
                )
                
                # Find best match
                best_match_index = np.argmin(face_distances)
                best_distance = face_distances[best_match_index]
                
                print(f"DEBUG: Best match distance: {best_distance:.4f} for name {self.known_face_names[best_match_index]}", file=sys.stderr)
                
                # Check if match is within tolerance
                if best_distance <= self.tolerance:
                    name = self.known_face_names[best_match_index]
                    # Convert distance to confidence score (0-1)
                    confidence = 1.0 - best_distance
                    
                    # Optional: Check for multiple potential matches
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, 
                        face_encoding, 
                        tolerance=self.tolerance
                    )
                    num_matches = sum(matches)
                    
                    if num_matches > 1:
                        print(f"DEBUG: Multiple matches found ({num_matches}), using closest", file=sys.stderr)
            
            recognized_faces.append({
                "name": name,
                "confidence": confidence,
                "encoding": face_encoding.tolist(),
                "location": face_location
            })
        
        return recognized_faces

    def add_known_face(self, name, encoding):
        """Add a known face encoding."""
        self.known_face_encodings.append(np.array(encoding))
        self.known_face_names.append(name)
        self.save_known_faces()

    def add_known_face_from_image(self, name, image_path):
        """
        Add a known face directly from an image file.
        Returns number of faces found and added.
        """
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(
            image,
            num_jitters=10  # Higher accuracy for training data
        )
        
        if len(face_encodings) == 0:
            print(f"No faces found in {image_path}", file=sys.stderr)
            return 0
        
        if len(face_encodings) > 1:
            print(f"Warning: Multiple faces found in {image_path}, using first one", file=sys.stderr)
        
        self.add_known_face(name, face_encodings[0])
        print(f"Added face encoding for {name}", file=sys.stderr)
        return len(face_encodings)

    def remove_duplicate_encodings(self, threshold=0.4):
        """
        Remove duplicate encodings for the same person.
        Keeps the most distinct encodings.
        """
        if len(self.known_face_encodings) == 0:
            return
        
        # Group by name
        name_groups = {}
        for name, encoding in zip(self.known_face_names, self.known_face_encodings):
            if name not in name_groups:
                name_groups[name] = []
            name_groups[name].append(encoding)
        
        # Remove duplicates within each group
        new_encodings = []
        new_names = []
        
        for name, encodings in name_groups.items():
            if len(encodings) == 1:
                new_encodings.append(encodings[0])
                new_names.append(name)
                continue
            
            # Keep first encoding, then only add if sufficiently different
            kept = [encodings[0]]
            for enc in encodings[1:]:
                distances = face_recognition.face_distance(kept, enc)
                if np.min(distances) > threshold:
                    kept.append(enc)
            
            for enc in kept:
                new_encodings.append(enc)
                new_names.append(name)
        
        self.known_face_encodings = new_encodings
        self.known_face_names = new_names
        self.save_known_faces()
        print(f"Reduced from {len(self.known_face_names)} to {len(new_names)} encodings", file=sys.stderr)

    def save_known_faces(self):
        """Save known faces to JSON file."""
        known_faces_data = {}
        for name, encoding in zip(self.known_face_names, self.known_face_encodings):
            if name not in known_faces_data:
                known_faces_data[name] = []
            known_faces_data[name].append(encoding.tolist())
        
        with open(self.known_faces_file, 'w') as f:
            json.dump(known_faces_data, f, indent=2)