# config.py
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv('BASE_URL')
OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'output')
DETAILS_DIR = os.path.join(OUTPUT_DIR, 'details')
