from fastapi import FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import StudyQuestionResponse, StudyNarrative
from app.utils import process_document

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload", response_model=StudyQuestionResponse)
async def upload_file(file: UploadFile = File(...), generation_type: str = Query("flashcards", enum=["flashcards", "narrative"])):
    if not file.filename.endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    content = await file.read()

    generated_content = process_document(
        content, file.filename, generation_type)
    if generation_type == "flashcards":
        return StudyQuestionResponse(study_questions=generated_content)
    elif generation_type == "narrative":
        return StudyQuestionResponse(study_narrative=generated_content)
    else:
        raise ValueError("generation type invalid. ")
