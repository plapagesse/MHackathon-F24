import re
from typing import List, Optional

from pydantic import BaseModel


class StudyQuestion(BaseModel):
    question: str
    options: list[str]
    correct_option_index: int

    @classmethod
    def from_text(cls, text: str) -> "StudyQuestion":
        # Regular expressions to extract question, options, and correct answer
        question_pattern = r"Question:\s*(.*)"
        option_pattern = r"(\d+)\.\s*(.*)"
        correct_answer_pattern = r"Correct answer:\s*(\d+)"

        # Extract the question
        question_match = re.search(question_pattern, text)
        if question_match:
            question = question_match.group(1).strip()
        else:
            raise ValueError("Question not found in text")

        # Extract the options
        options = []
        option_matches = re.findall(option_pattern, text)
        if option_matches:
            options = [match[1].strip() for match in option_matches]
        else:
            raise ValueError("Options not found in text")

        # Extract the correct answer index
        correct_answer_match = re.search(correct_answer_pattern, text)
        if correct_answer_match:
            correct_option_index = int(correct_answer_match.group(1)) - 1
        else:
            raise ValueError("Correct answer not found in text")

        # Return the populated StudyQuestion model
        return cls(
            question=question,
            options=options,
            correct_option_index=correct_option_index,
        )


class StudyNarrative(BaseModel):
    narrative: str
    misinformation: List[str]


class StudyQuestionResponse(BaseModel):
    study_questions: Optional[List[StudyQuestion]] = None
    study_narrative: Optional[StudyNarrative] = None


class Subtopic(BaseModel):
    name: str
    narrative: str
    misinformation: str


class Rounds(BaseModel):
    subtopics: list[Subtopic]
