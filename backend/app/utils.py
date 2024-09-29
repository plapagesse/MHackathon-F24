import io
import os
import random
import re
from typing import Dict, List

import pdfplumber
from app.schemas import Rounds, StudyNarrative, StudyQuestion, Subtopic
from docx import Document
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

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
def process_document(
    content: bytes, filename: str, generation_type: str
) -> List[StudyQuestion]:
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
            "Unsupported question/challenge type. Current options: 'flashcards', 'narrative'."
        )


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
        You are an expert educational content creator. Given the following content, create a flowing narrative explanation of the subject with 1 intentionally incorrect statement embedded.
        The players will need to identify this incorrect statement. List the incorrect statement at the end.

        Content: {content}

        Format:
        Narrative:
        [narrative here]

        Incorrect statement:
        1. <incorrect statement>
    """
    response = llm.invoke(prompt_template)
    narrative_text = response.content

    # print("RAW RESPONSE: ", narrative_text)

    narrative_parts = narrative_text.split("Incorrect statement:")
    narrative = narrative_parts[0].strip()
    incorrect_statements = [
        line.strip() for line in narrative_parts[1].strip().split("\n")
    ]

    print("narrative part", narrative)
    print("misinfo", incorrect_statements)

    return StudyNarrative(narrative=narrative, misinformation=incorrect_statements)


def generate_bullets_from_topic(topic: str) -> StudyNarrative:

    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OpenAI API key not found.")

    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)

    prompt_template = f"""
        You are an expert educational content creator. Given the following topic, create as litle as 10 aor as much as 40 subtopics relating to the main topic provided. 
        They must be subcategories of the main topic provided.

        Content: {topic}

        Format:
        . <subtopic 1>
        . <subtopic 2>
        . <subtopic 3>
    """
    response = llm.invoke(prompt_template)
    narrative_text = response.content

    subtopics = narrative_text.split(".")

    random_numbers = random.sample(range(0, len(subtopics)), 5)
    selected_topics = []
    for num in random_numbers:
        selected_topics.append(subtopics[num])

    # print(selected_topics)
    stopics = []
    for topic in selected_topics:
        print(topic)
        location = random.sample(["start", "middle", "end"], k=1)[0]
        narrative, incorrect_statements = generate_narrative_from_topic(topic, location)
        stopics.append(
            Subtopic(
                name=topic, narrative=narrative, misinformation=incorrect_statements
            )
        )
    return Rounds(subtopics=stopics)


def generate_narrative_from_topic(content: str, location) -> tuple[str, str]:

    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OpenAI API key not found.")

    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)

    prompt_template = f"""
        Given the following topic, create a flowing narrative with an explanation of the subject with 1 intentionally incorrect statement. Explain the topic, but include a sentence or concept that is
        wrong. You will say the wrong concept or statement as if it were true. You know it is not true, but you are trying to trick the players to think it is true, so state it with confidence. Place the incorrect statement 
        at the {location} of yor text. Remeber this statement at the {location} of your text will be incorrect, but you will say it as if it was correct. You will place it around the {location}, but not exactly at the {location}.
        This is a game where players will need to identify the incorrect part of your text. List the incorrect statement as the format states.

        Topic: {content}

        Format:
        Narrative:
        [narrative here]

        Incorrect statement:
        1. <incorrect statement>
    """
    response = llm.invoke(prompt_template)
    narrative_text = response.content

    # print("RAW RESPONSE: ", narrative_text)

    narrative_parts = narrative_text.split("Incorrect statement:")
    narrative = narrative_parts[0].strip()
    incorrect_statements = [
        line.strip() for line in narrative_parts[1].strip().split("\n")
    ]

    print("narrative part", narrative)
    print("misinfo", incorrect_statements)

    return narrative, incorrect_statements[0]


def grade_player_raw_answers(
    player_answers: Dict[str, str],
    study_narrative: StudyNarrative,
    max_time: float = 60.0,
    time_weight: float = 0.2,
) -> Dict[str, float]:
    """
    Grade players' answers as correct (1) or incorrect (0), and adjust the score based on response time for correct answers.

    Args:
        player_answers (Dict[str, Dict[str, float]]): A dictionary where the key is the player's name/id and the value is their answer and response time.
        study_narrative (StudyNarrative): The StudyNarrative object containing the correct misinformation.

    Returns:
        Tuple (raw_scores: Dict[str, float], final_scores: Dict[str, float]):
        - raw_scores: 1 if the answer is correct, 0 if incorrect.
        - final_scores: Adjusted scores based on correctness and response time.
    """
    raw_scores = {}
    final_scores = {}

    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OpenAI API key not found.")

    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)

    # The correct misinformation
    # Only 1 incorrect statement
    correct_misinformation = study_narrative.misinformation[0]

    for player, data in player_answers.items():
        answer = data["answer"]
        response_time = data["response_time"]

        # correct/incorrect grading
        prompt = f"""
        You are an expert grader. Check if the player's answer seems to understand/identify the incorrect statement from the narrative. It doesn't have to be an exact match but there should be evidence of understanding. Provide a score of 1 for correct and 0 for incorrect.

        Incorrect statement: {correct_misinformation}
        Player's answer: {answer}

        Your response should follow this structure:
        Final Score: [0 or 1]

        For example:
        Final Score: 1
        """
        print(f"Prompt for player {player}:\n{prompt}")

        try:
            response = llm.invoke(prompt)
            response_text = response.content.strip()
            print(f"Response for player {player}:\n{response_text}")

            # extract score after 'Final Score:'
            score_match = re.search(r"(Final Score:)\s*\**(\d)\**", response_text)
            if score_match:
                # 1 for correct, 0 for incorrect
                correctness_score = float(score_match.group(2))
            else:
                correctness_score = 0  # default to 0 if no valid score found

        except Exception as e:
            print(f"Error grading answer for player {player}: {e}")
            correctness_score = 0  # default to 0 in case of error

        raw_scores[player] = correctness_score

    # adjust scores based on response time for correct answers ONLY
    min_time = min([player_answers[player]["response_time"] for player in raw_scores])
    max_time = max([player_answers[player]["response_time"] for player in raw_scores])

    for player, score in raw_scores.items():
        time = player_answers[player]["response_time"]
        if score == 1:  # apply time adjustment for correct answers
            normalized_time = (
                (max_time - time) / (max_time - min_time)
                if max_time != min_time
                else 1.0
            )
            time_adjustment = normalized_time * time_weight
            final_score = score + time_adjustment * score
        else:
            final_score = score  # incorrect answers keep their score of 0

        final_scores[player] = final_score

    return raw_scores, final_scores
