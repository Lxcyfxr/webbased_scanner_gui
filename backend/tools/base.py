from abc import ABC, abstractmethod


class BaseTool(ABC):
    name: str
    label: str

    @abstractmethod
    def validate_target(self, target: str) -> bool: ...

    @abstractmethod
    def build_command(self, target: str, options: dict) -> list[str]: ...

    def parse_stderr_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line}

    def parse_stdout_line(self, line: str) -> dict | None:
        return {"type": "progress", "data": line}

    @abstractmethod
    def parse_result(self, stdout_lines: list[str]) -> dict: ...
