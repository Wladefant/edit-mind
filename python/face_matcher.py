import os
import sys
import json
import face_recognition
import numpy as np
from typing import List, Dict, Optional, Callable
import time
from dataclasses import dataclass

@dataclass
class MatchResult:
    """Result of a face match operation."""
    json_file: str
    image_file: str
    confidence: float
    face_data: dict

class FaceMatcher:
    """Handles face matching and labeling operations."""
    
    def __init__(self, tolerance: float = 0.6):
        """
        Initialize the face matcher.
        
        Args:
            tolerance: Lower is more strict. Default 0.6 is a good balance.
        """
        self.tolerance = tolerance
    
    def load_reference_encodings(self, image_paths: List[str]) -> List[np.ndarray]:
        """
        Load face encodings from reference images.
        
        Args:
            image_paths: List of paths to reference images
            
        Returns:
            List of face encodings
        """
        encodings = []
        
        for image_path in image_paths:
            try:
                image = face_recognition.load_image_file(image_path)
                face_encodings = face_recognition.face_encodings(image)
                
                if face_encodings:
                    encodings.append(face_encodings[0])
                    print(f"Loaded encoding from: {image_path}", file=sys.stderr)
                else:
                    print(f"Warning: No face found in {image_path}", file=sys.stderr)
            except Exception as e:
                print(f"Error loading {image_path}: {e}", file=sys.stderr)
        
        return encodings
    
    def find_matches(
        self,
        reference_encodings: List[np.ndarray],
        unknown_faces_dir: str,
        progress_callback: Optional[Callable[[dict], None]] = None
    ) -> List[MatchResult]:
        """
        Find all matching faces in the unknown faces directory.
        
        Args:
            reference_encodings: List of face encodings to match against
            unknown_faces_dir: Directory containing unknown face JSON files
            progress_callback: Optional callback for progress updates
            
        Returns:
            List of matching face results
        """
        matches = []
        json_files = [f for f in os.listdir(unknown_faces_dir) if f.endswith('.json')]
        total_files = len(json_files)
        start_time = time.monotonic()
        
        print(f"Scanning {total_files} unknown faces for matches...", file=sys.stderr)
        
        for idx, json_file in enumerate(json_files, 1):
            json_path = os.path.join(unknown_faces_dir, json_file)
            
            try:
                # Load face data
                with open(json_path, 'r') as f:
                    face_data = json.load(f)
                
                image_file = face_data.get('image_file')
                if not image_file:
                    continue
                
                image_path = os.path.join(unknown_faces_dir, image_file)
                
                if not os.path.exists(image_path):
                    print(f"Image not found: {image_path}", file=sys.stderr)
                    continue
                
                # Load and encode the unknown face
                unknown_image = face_recognition.load_image_file(image_path)
                unknown_encodings = face_recognition.face_encodings(unknown_image)
                
                if not unknown_encodings:
                    print(f"No face found in {image_file}", file=sys.stderr)
                    continue
                
                unknown_encoding = unknown_encodings[0]
                
                # Compare with reference encodings
                distances = face_recognition.face_distance(reference_encodings, unknown_encoding)
                min_distance = np.min(distances)
                
                if min_distance <= self.tolerance:
                    confidence = 1.0 - min_distance
                    matches.append(MatchResult(
                        json_file=json_file,
                        image_file=image_file,
                        confidence=float(confidence),
                        face_data=face_data
                    ))
                    print(f"Match found: {image_file} (confidence: {confidence:.2%})", file=sys.stderr)
                
            except Exception as e:
                print(f"Error processing {json_file}: {e}", file=sys.stderr)
            
            # Report progress
            if progress_callback and idx % 10 == 0:
                elapsed = time.monotonic() - start_time
                progress_percent = (idx / total_files) * 100
                try:
                    progress_callback({
                        "current": idx,
                        "total": total_files,
                        "progress": round(progress_percent, 1),
                        "elapsed": int(elapsed),
                        "matches_found": len(matches)
                    })
                except Exception as e:
                    print(f"Error sending progress: {e}", file=sys.stderr)
        
        return matches
    
    def get_face_id_from_json(self, json_file: str, unknown_faces_dir: str) -> Optional[str]:
        """Extract face_id from JSON file."""
        json_path = os.path.join(unknown_faces_dir, json_file)
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
                return data.get('image_hash')
        except Exception as e:
            print(f"Error reading face_id from {json_file}: {e}", file=sys.stderr)
            return None


async def find_and_label_matching_faces(
    person_name: str,
    reference_image_paths: List[str],
    unknown_faces_dir: str = "analysis_results/unknown_faces",
    tolerance: float = 0.6,
    progress_callback: Optional[Callable[[dict], None]] = None
) -> Dict[str, any]:
    """
    Find and return all faces matching the reference images.
    
    Args:
        person_name: Name of the person to label
        reference_image_paths: List of paths to reference images (the ones just labeled)
        unknown_faces_dir: Directory containing unknown faces
        tolerance: Face recognition tolerance (lower = more strict)
        progress_callback: Optional callback for progress updates
        
    Returns:
        Dictionary with matching faces information
    """
    import asyncio
    
    matcher = FaceMatcher(tolerance=tolerance)
    
    # Load reference encodings
    print(f"Loading {len(reference_image_paths)} reference images for {person_name}...", file=sys.stderr)
    reference_encodings = await asyncio.to_thread(
        matcher.load_reference_encodings,
        reference_image_paths
    )
    
    if not reference_encodings:
        return {
            "success": False,
            "error": "No valid face encodings found in reference images",
            "matches": []
        }
    
    print(f"Found {len(reference_encodings)} reference encodings", file=sys.stderr)
    
    matches = await asyncio.to_thread(
        matcher.find_matches,
        reference_encodings,
        unknown_faces_dir,
        progress_callback
    )
    
    match_data = []
    for match in matches:
        face_id = matcher.get_face_id_from_json(match.json_file, unknown_faces_dir)
        match_data.append({
            "json_file": match.json_file,
            "image_file": match.image_file,
            "confidence": match.confidence,
            "face_id": face_id,
            "face_data": match.face_data
        })
    
    return {
        "success": True,
        "person_name": person_name,
        "matches_found": len(match_data),
        "matches": match_data,
        "reference_images_used": len(reference_encodings)
    }