from collections import Counter
from typing import List, Dict, Optional, Union
from dataclasses import dataclass, asdict
import numpy as np
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult
from PIL import Image
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration


@dataclass
class SceneContext:
    """Scene environment analysis."""
    environment: str
    environment_confidence: float
    object_distribution: Dict[str, int]
    total_frames: int


class EnvironmentPlugin(AnalyzerPlugin):
    """Zero-shot environment classifier using AI-generated captions (BLIP)."""

    OBJECT_CONFIDENCE_THRESHOLD = 0.4

    def __init__(self, config: Dict[str, Union[str, bool, int, float]]):
        super().__init__(config)
        self.captions: List[str] = []
        self.detected_objects: List[str] = []
        self.scene_context: Optional[SceneContext] = None
        self.processor: Optional[BlipProcessor] = None
        self.model: Optional[BlipForConditionalGeneration] = None

    def setup(self) -> None:
        """Load BLIP captioning model."""
        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        """Caption each frame to understand its environment."""
        if self.processor is None or self.model is None:
            return frame_analysis
            
        image = Image.fromarray(frame)

        inputs = self.processor(image, return_tensors="pt")
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=40)

        caption = self.processor.decode(out[0], skip_special_tokens=True)
        caption = caption.lower()

        self.captions.append(caption)
        frame_analysis["environment_caption"] = caption

        for obj in frame_analysis.get("objects", []):
            confidence = obj.get("confidence", 0)
            if isinstance(confidence, (int, float)) and confidence > self.OBJECT_CONFIDENCE_THRESHOLD:
                label = obj.get("label")
                if isinstance(label, str):
                    self.detected_objects.append(label)

        return frame_analysis

    def analyze_scene(self, all_frame_analyses: List[FrameAnalysis]) -> None:
        """Infer environment from captions and objects."""
        if not self.captions:
            self.scene_context = SceneContext(
                environment="unknown",
                environment_confidence=0.0,
                object_distribution={},
                total_frames=len(all_frame_analyses)
            )
            return

        full_text = " ".join(self.captions)

        environment_keywords: Dict[str, List[str]] = {
            "beach": ["beach", "ocean", "shore", "sand", "coast", "seaside", "waves"],
            "forest": ["forest", "woods", "trees", "woodland", "jungle", "rainforest"],
            "mountain": ["mountain", "hill", "trail", "cliff", "peak", "summit", "alpine"],
            "desert": ["desert", "sand dunes", "arid", "cactus", "barren"],
            "snow": ["snow", "ice", "ski", "winter", "frozen", "glacier"],
            "park": ["park", "grass field", "playground", "garden", "lawn"],
            "aquatic": ["lake", "river", "sea", "water", "pond", "stream"],
            "underwater": ["underwater", "coral", "reef", "diving", "submarine"],
            "urban": ["street", "city", "road", "traffic", "downtown", "building", "sidewalk"],
            "suburban": ["suburban", "neighborhood", "residential", "driveway", "suburb"],
            "highway": ["highway", "freeway", "motorway", "expressway"],
            "parking": ["parking lot", "garage", "parking"],
            "office": ["office", "desk", "cubicle", "workspace", "conference room"],
            "home_interior": ["living room", "bedroom", "kitchen", "bathroom", "hallway"],
            "restaurant": ["restaurant", "cafe", "diner", "dining", "cafeteria"],
            "store": ["store", "shop", "mall", "retail", "supermarket"],
            "warehouse": ["warehouse", "storage", "factory", "industrial"],
            "gym": ["gym", "fitness", "workout", "exercise room"],
            "hospital": ["hospital", "clinic", "medical", "emergency room"],
            "school": ["classroom", "school", "university", "library", "campus"],
            "stadium": ["stadium", "arena", "field", "court", "sports"],
            "playground": ["playground", "swing", "slide", "playscape"],
            "airport": ["airport", "terminal", "runway", "hangar"],
            "train_station": ["train station", "railway", "platform", "subway"],
            "farm": ["farm", "barn", "field", "crops", "agriculture"],
            "construction": ["construction", "building site", "scaffolding", "crane"],
            "tunnel": ["tunnel", "underground passage"],
            "bridge": ["bridge", "overpass", "viaduct"],
        }
        
        env_scores: Dict[str, int] = {env: 0 for env in environment_keywords}

        for env, keywords in environment_keywords.items():
            for w in keywords:
                if w in full_text:
                    env_scores[env] += 1

        best_env = max(env_scores, key=env_scores.get)
        best_score = env_scores[best_env]

        total_keywords_found = sum(env_scores.values())
        confidence = (
            best_score / total_keywords_found
            if total_keywords_found > 0 else 0.0
        )

        if best_score == 0:
            best_env = "N/A"
            confidence = 0.0

        object_counts = dict(Counter(self.detected_objects))

        self.scene_context = SceneContext(
            environment=best_env,
            environment_confidence=float(confidence),
            object_distribution=object_counts,
            total_frames=len(all_frame_analyses)
        )

    def get_results(self) -> Optional[Dict[str, Union[str, float, Dict[str, int], int]]]:
        if self.scene_context:
            return asdict(self.scene_context)
        return None

    def get_summary(self) -> Optional[Dict[str, Union[str, float, Dict[str, int]]]]:
        if not self.scene_context:
            return None
        return {
            "primary_environment": self.scene_context.environment,
            "confidence": self.scene_context.environment_confidence,
            "top_objects": dict(
                Counter(self.scene_context.object_distribution).most_common(5)
            ),
        }