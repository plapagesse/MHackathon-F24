# test_grading.py

from app.schemas import StudyNarrative
from app.utils import grade_player_raw_answers


def main():

    study_narrative = StudyNarrative(
        narrative="""
        V2-deletion is a fascinating linguistic phenomenon that involves the removal of the second vowel in three-syllable words, particularly when the first syllable carries the stress. Such words as "family," "memory," and "rattling" serve as prime examples of this interesting deletion process. The study of V2-deletion has garnered attention in recent literature, with several articles available on the Canvas learning platform under the section Files > Assignments > Writing > Paper1 > Readings.

To explore this phenomenon further, researchers designed a study utilizing a comprehensive database, the CELEX dictionary, which provided a wealth of three-syllable words fitting specific criteria. The criteria included that the first syllable must have stress while the second syllable does not. From this list, a total of 2,250 words were randomly selected and divided into nine sets, each containing 250 words. 

The annotation process involved undergraduate students from the University of Michigan, with each student assigned to annotate one specific set of words. The main question posed during this annotation was whether a given word could be pronounced with only two syllables. Participants were given four possible answer choices: yes, no, maybe, or don’t know. 

In processing the data collected from these annotations, researchers categorized responses into various interpretations. For instance, responses indicating uncertainty, such as "idk," were standardized to "don’t know." They also established a numerical conversion for the answers: “Yes” was assigned a value of 1, “Maybe” 0.5, “No” 0, and “Don’t know” was treated as an unknown variable. This conversion allowed for the calculation of average scores by summing the weighted answers and dividing by the total number of responses.

The resulting data summary provided insights into the patterns of stress placement and the frequency of V2-deletion occurrences. Importantly, researchers also examined correlations between the number of medial consonants following V2-deletion and the deletion score, as well as the loudness differences in consonants based on the vowel that was deleted. Tables were prepared to convey these findings clearly.

In summary, V2-deletion showcases the dynamic nature of language and the subtle ways in which stress patterns influence pronunciation. This area of study not only enriches our understanding of phonetics but also highlights the complexities involved in language processing. """,
        misinformation=[
            "**",
            "1. The first syllable must have secondary stress while the second syllable does not.",
        ],
    )

    # sample player answers
    player_answers = {
        "Alice": {
            "answer": "The first syllable in V2-deletion has primary stress, not secondary stress.",
            "response_time": 45.0,
        },
        "Bob": {
            "answer": "V2-deletion examples involve main stress on the first syllable, not secondary stress as stated.",
            "response_time": 20.0,
        },
        "Charlie": {
            "answer": "The first syllable in V2-deletion has no stress while the second syllable carries the stress.",
            "response_time": 20.0,
        },
        "Diana": {
            "answer": "The second syllable is stressed in V2-deletion, which is why the first vowel is deleted.",
            "response_time": 35.0,
        },
    }

    # call grading function
    raw_scores, scores = grade_player_raw_answers(player_answers, study_narrative)
    print("RAW SCORES")

    for player, score in raw_scores.items():
        print(f"{player}: {score}/10")

    print("SCORES WITH TIMING")

    for player, score in scores.items():
        print(f"{player}: {score}")


if __name__ == "__main__":
    main()
