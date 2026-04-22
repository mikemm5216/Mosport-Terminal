from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseAgent(ABC):
    name: str

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        pass
