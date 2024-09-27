// src/components/QuestionsTable.jsx
import React from "react";
import "./QuestionsTable.css";

function QuestionsTable({ studyQuestions, onDiscard }) {
  return (
    <div className="questions-container">
      <h2>Generated Study Questions</h2>
      <table className="questions-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Question</th>
            <th>Options</th>
            <th>Correct Answer</th>
          </tr>
        </thead>
        <tbody>
          {studyQuestions.map((q, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{q.question}</td>
              <td>
                <ol type="A">
                  {q.options.map((option, idx) => (
                    <li key={idx}>{option}</li>
                  ))}
                </ol>
              </td>
              <td>
                {String.fromCharCode(65 + q.correct_option_index)}.{" "}
                {q.options[q.correct_option_index]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="discard-button" onClick={onDiscard}>
        Discard Questions
      </button>
    </div>
  );
}

export default QuestionsTable;
