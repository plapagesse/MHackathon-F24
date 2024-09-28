import io
import os
import random
from typing import List

from dotenv import load_dotenv

import pdfplumber
from docx import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from app.schemas import StudyQuestion, StudyNarrative

# from langchain_ollama import ChatOllama


# Function to extract text from PDF using pdfplumber
def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from PDF bytes using pdfplumber.

    Args:
        content (bytes): PDF file content in bytes.

    Returns:
        str: Extracted text.
    """
    text = ""
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


# Function to extract text from DOCX using python-docx
def extract_text_from_docx(content: bytes) -> str:
    """
    Extract text from DOCX bytes using python-docx.

    Args:
        content (bytes): DOCX file content in bytes.

    Returns:
        str: Extracted text.
    """
    text = ""
    with io.BytesIO(content) as docx_file:
        document = Document(docx_file)
        for para in document.paragraphs:
            text += para.text + "\n"
    return text


# Function to process document and generate flashcards (multiple choice questions)
def process_document(content: bytes, filename: str, generation_type: str) -> List[StudyQuestion]:
    """
    Process the input document and generate multiple-choice flashcards.

    Args:
        content (bytes): The content of the document in bytes.
        filename (str): The name of the file to determine its type.

    Returns:
        List[str]: A list of generated flashcard questions.
    """
    # Convert bytes content to string
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(content)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(content)
    else:
        # Assume it's plain text
        text = content.decode("utf-8")

    # Split the document into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,  # Adjust chunk size as needed
        chunk_overlap=50,  # To retain context between chunks
    )
    documents = text_splitter.split_text(text)

    if generation_type == "flashcards":
        return generate_flashcards_from_chunks(documents)
    elif generation_type == "narrative":
        return generate_narrative_with_misinformation(" ".join(documents))
    else:
        raise ValueError(
            "Unsupported question/challenge type. Current options: 'flashcards', 'narrative'.")


def generate_flashcards_from_chunks(chunks: List[str]) -> List[StudyQuestion]:

    # Initialize the LLM (ensure the OpenAI API key is set)
    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError(
            "OpenAI API key not found. Please set the OPENAI_API_KEY environment variable."
        )

    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)
    # llm = ChatOllama(model="phi3:3.8b")

    # Prompt template for generating questions
    prompt_template = """
You are a question generation assistant. Given the following chunk of text, create 2 multiple choice questions testing facts directly sourced from the text. Ensure each question has 4 options with one correct answer. Format your output as shown below.

Question: <question here>
1. <answer 1>
2. <answer 2>
3. <answer 3>
4. <answer 4>
Correct answer: <number>

Text: {chunk}

Questions:
"""

    # Initialize the LLM Chain with the prompt template
    prompt = PromptTemplate(
        input_variables=["chunk"],
        template=prompt_template,
    )
    chain = prompt | llm | StrOutputParser()

    study_questions = []

    # Process each document chunk and generate flashcards
    for chunk in chunks:
        try:
            # Generate the questions for each chunk
            result = chain.invoke({"chunk": chunk})
            # Split result into individual questions
            # Assuming the LLM separates questions by double newlines
            questions = result.strip().split("\n\n")
            questions = [StudyQuestion.from_text(text) for text in questions]
            study_questions.extend(questions)
        except Exception as e:
            print(f"Error generating questions for a chunk: {e}")

    # Shuffle the questions to mix content from different sections
    random.shuffle(study_questions)

    return study_questions


def generate_narrative_with_misinformation(content: str) -> StudyNarrative:

    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OpenAI API key not found.")

    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)

    prompt_template = f"""
        You are an expert educational content creator. Given the following content, create a flowing narrative explanation of the subject with 3-5 intentionally incorrect statements embedded.
        The players will need to identify these incorrect statements. List the incorrect statements at the end.

        Content: {content}

        Format:
        Narrative:
        [narrative here]

        Incorrect statements:
        1. <incorrect statement>
        2. <incorrect statement>
    """
    response = llm.invoke(prompt_template)
    narrative_text = response.content

    # print("RAW RESPONSE: ", narrative_text)

    narrative_parts = narrative_text.split("Incorrect statements:")
    narrative = narrative_parts[0].strip()
    incorrect_statements = [line.strip()
                            for line in narrative_parts[1].strip().split("\n")]

    print("narrative part", narrative)
    print("misinfo", incorrect_statements)

    return StudyNarrative(narrative=narrative, misinformation=incorrect_statements)
