import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import "../styles/SurveyPage.css";
import { listSurveys, submitSurveyResponse, getUserSurveyResponse, Survey, SurveyResponse } from "../services/api";


const SurveyPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [userResponse, setUserResponse] = useState<SurveyResponse | null>(null);
  const [hasResponded, setHasResponded] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchSurveys();
  }, [user, navigate]);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const data = await listSurveys();
      setSurveys(data);

      // If there are surveys, check if user has already responded to the first one
      if (data.length > 0) {
        checkUserResponse(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const checkUserResponse = async (surveyId: string) => {
    try {
      const data = await getUserSurveyResponse(surveyId);
      if (data) {
        setUserResponse(data);
        setHasResponded(true);
      } else {
        setHasResponded(false);
      }
    } catch (err) {
      setHasResponded(false);
    }
  };

  const handleSurveySelect = (survey: Survey) => {
    setSelectedSurvey(survey);
    setResponses({});
    checkUserResponse(survey.id);
  };

  const handleResponseChange = (questionId: string, value: number) => {
    setResponses({
      ...responses,
      [questionId]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSurvey) {
      setError("No survey selected");
      return;
    }

    // Validate all questions have responses
    const unansweredQuestions = selectedSurvey.questions.filter(
      (q) => !(q.id in responses)
    );
    if (unansweredQuestions.length > 0) {
      setError("Please answer all questions before submitting");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data = await submitSurveyResponse(selectedSurvey.id, responses);
      setUserResponse(data);
      setHasResponded(true);
      setError(null);
      // Clear form
      setResponses({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return <div className="survey-page">Please log in to take surveys.</div>;
  }

  return (
    <div className="survey-page">
      <div className="survey-container">
        <h1>Wellbeing Surveys</h1>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading surveys...</div>
        ) : surveys.length === 0 ? (
          <div className="no-surveys">No surveys available at this time.</div>
        ) : !selectedSurvey ? (
          <div className="survey-list">
            <p>Select a survey to get started:</p>
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="survey-card"
                onClick={() => handleSurveySelect(survey)}
              >
                <h3>{survey.title}</h3>
                <p>{survey.description}</p>
                <span className="survey-questions">
                  {survey.questions.length} questions
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="survey-form-container">
            <button
              className="back-button"
              onClick={() => {
                setSelectedSurvey(null);
                setResponses({});
              }}
            >
              ← Back to Surveys
            </button>

            <h2>{selectedSurvey.title}</h2>
            <p className="survey-description">{selectedSurvey.description}</p>

            {hasResponded && userResponse && (
              <div className="already-responded">
                <p>
                  ✓ You have already completed this survey on{" "}
                  {new Date(userResponse.submittedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="survey-form">
              {selectedSurvey.questions.map((question) => (
                <div key={question.id} className="question-group">
                  <label>{question.text}</label>

                  {question.type === "scale" && question.scale && (
                    <div className="scale-container">
                      <div className="scale-labels">
                        <span className="min-label">
                          {question.scale.minLabel ||
                            `${question.scale.min}`}
                        </span>
                        <span className="max-label">
                          {question.scale.maxLabel ||
                            `${question.scale.max}`}
                        </span>
                      </div>
                      <div className="scale-inputs">
                        {Array.from(
                          {
                            length:
                              question.scale.max - question.scale.min + 1,
                          },
                          (_, i) => question.scale!.min + i
                        ).map((value) => (
                          <label key={value} className="scale-option">
                            <input
                              type="radio"
                              name={question.id}
                              value={value}
                              checked={responses[question.id] === value}
                              onChange={(e) =>
                                handleResponseChange(
                                  question.id,
                                  parseInt(e.target.value)
                                )
                              }
                            />
                            <span>{value}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="submit-button"
                disabled={submitting || hasResponded}
              >
                {submitting
                  ? "Submitting..."
                  : hasResponded
                    ? "Already Completed"
                    : "Submit Response"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyPage;
