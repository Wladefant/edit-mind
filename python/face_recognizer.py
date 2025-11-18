import face_recognition
import numpy as np
import json
from collections import defaultdict

class FaceRecognizer:
    def __init__(self, known_faces_file='.faces.json', tolerance=0.5, model='cnn'):
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
        self.unknown_face_encodings = defaultdict(list)
        self.unknown_face_counter = 0
        self.load_known_faces()

    def reload_known_faces(self):
        """Explicitly reloads known faces from the file."""
        self.known_face_encodings = []
        self.known_face_names = []
        self.unknown_face_encodings = defaultdict(list)
        self.unknown_face_counter = 0
        self.load_known_faces()
            
    def load_known_faces(self):
        with open(self.known_faces_file, 'r') as f:
            known_faces_data = json.load(f)
            
            if isinstance(known_faces_data, dict):
                for name, encodings in known_faces_data.items():
                    for encoding in encodings:
                        self.known_face_encodings.append(np.array(encoding))
                        self.known_face_names.append(name)
            elif isinstance(known_faces_data, list):
                for entry in known_faces_data:
                    name = entry.get("name")
                    enc = entry.get("encoding") or entry.get("encodings")
                    if name and enc:
                        if isinstance(enc[0], list):
                            for e in enc:
                                self.known_face_encodings.append(np.array(e))
                                self.known_face_names.append(name)
                        else:
                            self.known_face_encodings.append(np.array(enc))
                            self.known_face_names.append(name)



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
        def distance_to_confidence(face_distance, tolerance=self.tolerance):
            """Convert face distance to confidence (0-1 scale)."""
            if face_distance > tolerance:
                return 0.0
            # Smooth mapping: closer distance -> higher confidence
            return round((1.0 - face_distance / tolerance) ** 2, 2)
        
        recognized_faces = []
        for face_location, face_encoding in zip(face_locations, face_encodings):
            name = "Unknown"
            confidence = 0.0

            if len(self.known_face_encodings) > 0:
                # Calculate distances to all known faces
                face_distances = face_recognition.face_distance(
                    self.known_face_encodings, 
                    face_encoding,
                )
                
                # Find best match
                best_match_index = np.argmin(face_distances)
                best_distance = face_distances[best_match_index]
                
                
                # Check if match is within tolerance
                if best_distance <= self.tolerance:
                    name = self.known_face_names[best_match_index]
                    # Convert distance to confidence score (0-1)
                    confidence = distance_to_confidence(best_distance, self.tolerance)

            
            if name == "Unknown":
                # Check if this unknown face has been seen before
                found_existing_unknown = False
                for unknown_name, encodings in self.unknown_face_encodings.items():
                    if encodings:
                        distances = face_recognition.face_distance(encodings, face_encoding)
                        if np.min(distances) <= self.tolerance:
                            name = unknown_name
                            found_existing_unknown = True
                            confidence = distance_to_confidence(np.min(distances), self.tolerance)
                            break
                
                if not found_existing_unknown:
                    name = f"Unknown_{self.unknown_face_counter:03d}"
                    self.unknown_face_counter += 1
                    confidence = 0.0 
                self.unknown_face_encodings[name].append(face_encoding)

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

    def save_known_faces(self):
        """Save known faces to JSON file."""
        known_faces_data = {}
        for name, encoding in zip(self.known_face_names, self.known_face_encodings):
            if name not in known_faces_data:
                known_faces_data[name] = []
            known_faces_data[name].append(encoding.tolist())
        
        with open(self.known_faces_file, 'w') as f:
            json.dump(known_faces_data, f, indent=2)

    def get_all_faces(self):
        """
        Returns a list of all known and unknown faces with their representative encodings and counts.
        """
        all_faces = defaultdict(list)
        for name, encoding in zip(self.known_face_names, self.known_face_encodings):
            all_faces[name].append(encoding)
        
        for name, encodings in self.unknown_face_encodings.items():
            all_faces[name].extend(encodings)

        result = []
        for name, encodings in all_faces.items():
            # For simplicity, use the first encoding as representative and count all occurrences
            if encodings:
                result.append({
                    "name": name,
                    "encoding": encodings[0].tolist(),
                    "count": len(encodings)
                })
        return result

    def label_face(self, old_name, new_name):
        """
        Labels an existing face (known or unknown) with a new name.
        If old_name was unknown, it becomes known.
        """
        # Move encodings from unknown to known if applicable
        if old_name.startswith("Unknown_") and old_name in self.unknown_face_encodings:
            for encoding in self.unknown_face_encodings[old_name]:
                self.add_known_face(new_name, encoding)
            del self.unknown_face_encodings[old_name]
        else:
            # Update existing known face names
            for i, name in enumerate(self.known_face_names):
                if name == old_name:
                    self.known_face_names[i] = new_name
        self.save_known_faces()

    def merge_faces(self, names_to_merge, new_name):
        """
        Merges multiple faces (known or unknown) under a single new name.
        """
        merged_encodings = []
        for name in names_to_merge:
            if name.startswith("Unknown_") and name in self.unknown_face_encodings:
                for encoding in self.unknown_face_encodings[name]:
                    merged_encodings.append(encoding)
                del self.unknown_face_encodings[name]
            else:
                # Collect encodings of known faces to merge
                for i, known_name in enumerate(self.known_face_names):
                    if known_name == name:
                        merged_encodings.append(self.known_face_encodings[i])
                        # Remove old entry to avoid duplicates
                        self.known_face_encodings[i] = None # Mark for deletion
                        self.known_face_names[i] = None # Mark for deletion
        
        # Clean up marked for deletion
        self.known_face_encodings = [e for e in self.known_face_encodings if e is not None]
        self.known_face_names = [n for n in self.known_face_names if n is not None]

        # Add merged encodings under the new name
        for encoding in merged_encodings:
            self.add_known_face(new_name, encoding)
        
        self.save_known_faces()
