from dataclasses import dataclass
from typing import Dict, List
from collections import Counter
import numpy as np
from plugins.base import AnalyzerPlugin, FrameAnalysis, PluginResult

from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch
import re


@dataclass
class Activity:
    activity: str
    confidence: float
    primary_objects: List[str]


class ActivityPlugin(AnalyzerPlugin):
    def __init__(self, config: Dict[str, str]):
        super().__init__(config)
        self.captions: List[str] = []
        self.frame_objects: List[str] = []
        self.activities: List[Activity] = []

    def setup(self):
        self.processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
        self.model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )

    def analyze_frame(self, frame: np.ndarray, frame_analysis: FrameAnalysis, video_path: str) -> FrameAnalysis:
        image = Image.fromarray(frame)

        inputs = self.processor(image, return_tensors="pt")
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=30)

        caption = self.processor.decode(out[0], skip_special_tokens=True)
        self.captions.append(caption)

        frame_analysis["activity_caption"] = caption

        # Save objects if available
        for obj in frame_analysis.get("objects", []):
            if obj.get("confidence", 0) > 0.4:
                self.frame_objects.append(obj["label"])

        return frame_analysis

    def analyze_scene(self, all_frame_analyses: List[FrameAnalysis]) -> None:
        if not self.captions:
            return

        # Combine all captions into one big text
        full_text = " ".join(self.captions).lower()

        # Extract verbs (simple heuristic)
        # You can improve this later using spaCy or NLTK
        verbs = re.findall(r"\b(\w+ing)\b", full_text)

        # If no verb found → fallback to full caption summary
        activity = verbs[0] if verbs else self.captions[0]

        # Confidence = % of frames agreeing on similar captions
        confidence = 1.0 / (1 + len(set(self.captions)))

        # Primary objects
        obj_counts = Counter(self.frame_objects)
        primary_objects = [o for o, _ in obj_counts.most_common(3)]

        self.activities = [
            Activity(
                activity=activity,
                confidence=float(confidence),
                primary_objects=primary_objects
            )
        ]

    def get_results(self) -> PluginResult:
        return [a.__dict__ for a in self.activities]

    def get_summary(self) -> PluginResult:
        if not self.activities:
            return None
        a = self.activities[0]
        return {
            "primary_activity": a.activity,
            "confidence": a.confidence,
            "primary_objects": a.primary_objects
        }
