import uuid

import redis
from app.schemas import StudyQuestionResponse
from app.utils import process_document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
conn = redis.Redis(host="redis")


# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload", response_model=StudyQuestionResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    content = await file.read()
    study_questions = process_document(content, file.filename)
    print(study_questions)
    return StudyQuestionResponse(study_questions=study_questions)


@app.post("/create-lobby")
def create_lobby():
    lobby_id = uuid.uuid4().hex
    return_val = conn.hset(f"lobby:{lobby_id}", mapping={"creator": "1"})
    return {"lobby_id": lobby_id}
