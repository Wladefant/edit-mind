from abc import ABC, abstractmethod
from typing import Dict, Union, List
import numpy as np


FrameAnalysis = Dict[str, str]
PluginResult = Union[Dict, List, object, None]


class AnalyzerPlugin(ABC):
    """
    Base class for all video analysis plugins.
    
    Plugins extend the video analysis pipeline by processing frames
    and extracting specific types of information (objects, faces, etc).
    """

    def __init__(self, config: Dict[str, str]):
        """
        Initialize plugin with configuration.
        
        Args:
            config: Configuration dictionary containing plugin settings
        """
        self.config = config

    @abstractmethod
    def setup(self) -> None:
        """
        Perform one-time initialization (load models, resources, etc).
        Called once before frame processing begins.
        """
        pass

    @abstractmethod
    def analyze_frame(
        self, 
        frame: np.ndarray, 
        frame_analysis: FrameAnalysis, 
        video_path: str
    ) -> FrameAnalysis:
        """
        Analyze a single video frame.
        
        Args:
            frame: Video frame as NumPy array (BGR format)
            frame_analysis: Existing analysis data for this frame
            video_path: Path to the video being analyzed
            
        Returns:
            Updated frame_analysis dictionary with plugin results
        """
        pass

    @abstractmethod
    def get_results(self) -> PluginResult:
        """
        Return accumulated results from all processed frames.
        Called after all frames have been analyzed.
        """
        pass

    @abstractmethod
    def get_summary(self) -> PluginResult:
        """
        Return high-level summary of analysis results.
        Called after processing is complete.
        """
        pass