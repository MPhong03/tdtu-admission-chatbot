from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import torch.nn.functional as F
import spacy
import torch
import re

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder="./models")
ner_nlp = spacy.load("ner_model_cleaned")
app = FastAPI()

# ========= DATA MODELS =========
class TextInput(BaseModel):
    text: str

class SimilarityInput(BaseModel):
    source: str
    targets: List[str]

class AnalysisOutput(BaseModel):
    intent: str
    entities: List[dict]

# ======== METHODS =========
def extract_entities(text: str):
    doc = ner_nlp(text)
    return [
        {
            "text": ent.text,
            "start": ent.start_char,
            "end": ent.end_char,
            "label": ent.label_
        }
        for ent in doc.ents
    ]

# ========= EMBEDDING ENDPOINTS =========
@app.post("/embedding")
def get_embedding(body: TextInput):
    vec = model.encode(body.text).tolist()
    return {"embedding": vec}

@app.post("/similarity")
def get_similarity(body: SimilarityInput):
    sentences = [body.source] + body.targets
    embeddings = model.encode(sentences, convert_to_tensor=True)

    source_vec = embeddings[0]
    target_vecs = embeddings[1:]

    scores = F.cosine_similarity(source_vec.unsqueeze(0), target_vecs).tolist()

    return {"scores": scores}

# ========= RULE-BASED INTENT + ENTITY =========
@app.post("/analyze", response_model=AnalysisOutput)
def analyze(body: TextInput):
    text = body.text
    
    # Dự đoán thực thể bằng mô hình spaCy
    entities = extract_entities(text)

    return {"entities": entities}