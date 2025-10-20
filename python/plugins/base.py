
from abc import ABC, abstractmethod
from typing import List, Dict, Any

import numpy as np

class AnalyzerPlugin(ABC):
    """
    Abstract base class for an analyzer plugin.
    """

    @abstractmethod
    def __init__(self, config: Dict[str, Any]):
        """
        Initializes the plugin with a configuration dictionary.
        """
        self.config = config

    @abstractmethod
    def setup(self):
        """
        Performs any one-time setup for the plugin, such as loading models.
        """
        pass

    @abstractmethod
    def analyze_frame(self, frame: np.ndarray, frame_analysis: Dict[str, Any], video_path: str) -> Dict[str, Any]:
        """
        Analyzes a single frame and returns a dictionary of results.

        :param frame: The frame to analyze.
        :param frame_analysis: A dictionary containing the analysis results so far for the current frame.
        :return: An updated dictionary with the analysis results from this plugin.
        """
        pass

    @abstractmethod
    def get_results(self) -> Any:
        """
        Returns the final analysis results from the plugin.
        """
        pass

    @abstractmethod
    def get_summary(self) -> Any:
        """
        Returns a summary of the analysis results.
        """
        pass
