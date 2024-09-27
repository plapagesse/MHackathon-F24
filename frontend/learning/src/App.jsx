// src/App.jsx
import { useState } from "react";
import "./App.css";
import FileUpload from "./components/FileUpload";
import QuestionsTable from "./components/QuestionsTable";

function App() {
  const [studyQuestions, setStudyQuestions] = useState([]);

  const handleDiscard = () => {
    setStudyQuestions([]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Study Questions Generator</h1>
      </header>
      <main>
        {studyQuestions.length === 0 ? (
          <FileUpload setStudyQuestions={setStudyQuestions} />
        ) : (
          <QuestionsTable
            studyQuestions={studyQuestions}
            onDiscard={handleDiscard}
          />
        )}
      </main>
    </div>
  );
}

export default App;
