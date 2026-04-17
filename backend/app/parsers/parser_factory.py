from typing import List, Dict, Any
from app.parsers.base_parser import BaseParser
from app.parsers.csv_parser import CSVParser
from app.parsers.ofx_parser import OFXParser

class ParserFactory:
    """Factory to get appropriate parser for a file"""
    
    def __init__(self):
        self.parsers: List[BaseParser] = [
            OFXParser(),
            CSVParser(),
        ]
    
    def get_parser(self, filename: str, content: bytes) -> BaseParser:
        """Get appropriate parser for the file"""
        for parser in self.parsers:
            if parser.can_parse(filename, content):
                return parser
        raise ValueError(f"No parser found for file: {filename}")
    
    def parse_file(self, filename: str, content: bytes) -> List[Dict[str, Any]]:
        """Parse file using appropriate parser"""
        parser = self.get_parser(filename, content)
        return parser.parse(filename, content)
