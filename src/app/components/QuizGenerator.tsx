"use client";
import { useCompletion } from "ai/react";

export default function QuizGenerator() {
  const {
    handleSubmit,
    handleInputChange,
    input,
    completion,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/generate-quiz",
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          placeholder="Enter YouTube video URL"
          onChange={handleInputChange}
        />
        <button type="submit" disabled={isLoading}>
          Generate Quiz
        </button>
      </form>
      {isLoading && <p>Generating quiz...</p>}
      {error && <p>Error: {error.message}</p>}
      {completion && (
        <div>
          <h2>Generated Quiz:</h2>
          <pre>{completion}</pre>
        </div>
      )}
    </div>
  );
}
