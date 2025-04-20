python -m venv venv
source venv/bin/activate  # Trên Mac/Linux
venv\Scripts\activate     # Trên Windows

python -m uvicorn app:app --reload --port 8000
