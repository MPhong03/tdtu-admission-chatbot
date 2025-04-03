from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from typing import List
import torch
import torch.nn.functional as F

model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder="./models")
app = FastAPI()

class TextInput(BaseModel):
    text: str

class SimilarityInput(BaseModel):
    source: str
    targets: List[str]

@app.post("/embedding")
def get_embedding(body: TextInput):
    vec = model.encode(body.text).tolist()
    return { "embedding": vec }

@app.post("/similarity")
def get_similarity(body: SimilarityInput):
    sentences = [body.source] + body.targets
    embeddings = model.encode(sentences, convert_to_tensor=True)

    source_vec = embeddings[0]
    target_vecs = embeddings[1:]

    scores = F.cosine_similarity(source_vec.unsqueeze(0), target_vecs).tolist()

    return { "scores": scores }
