"""
Configuration file for the Validation Agent
Loads configuration from environment variables
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('env.local')

# API Keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SERPAPI_KEY = os.getenv('SERPAPI_KEY')

# Model Configuration
DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'gpt-4')
DEFAULT_TEMPERATURE = float(os.getenv('DEFAULT_TEMPERATURE', '0.1'))
DEFAULT_MAX_TOKENS = int(os.getenv('DEFAULT_MAX_TOKENS', '1000'))

# Search Configuration
MAX_SEARCH_RESULTS = int(os.getenv('MAX_SEARCH_RESULTS', '3'))
SEARCH_DELAY = int(os.getenv('SEARCH_DELAY', '1'))  # seconds between searches to avoid rate limiting
