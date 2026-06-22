import { useEffect, useState } from "react";
import { getSymptoms, predictDisease, getHistory, extractSymptoms } from "./api";
import Auth from "./auth";
import "./App.css";

function cleanSymptom(s) {
  return s.replace(/_/g, " ").trim().toLowerCase();
}

function App() {
  const [user, setUser] = useState(localStorage.getItem("username") || null);
  const [patientName, setPatientName] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomText, setSymptomText] = useState("");
  const [unknownTerms, setUnknownTerms] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    if (user) {
      loadSymptoms();
      loadHistory();
    }
  }, [user]);

  const handleLogin = (username) => {
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    setUser(null);
    setResult(null);
    setSelectedSymptoms([]);
    setHistory([]);
  };

  const loadSymptoms = async () => {
    try {
      const response = await getSymptoms();
      setSymptoms(response.data.map(cleanSymptom));
    } catch (error) {
      alert("Failed to load symptoms. Make sure backend is running.");
    }
  };

  const loadHistory = async () => {
    try {
      const response = await getHistory();
      setHistory(response.data);
    } catch (error) {
      console.log("History loading failed", error);
    }
  };

  const handleSymptomChange = (event) => {
    const symptom = cleanSymptom(event.target.value);
    if (symptom && !selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
    event.target.value = "";
  };

  const removeSymptom = (symptom) => {
    setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
  };

  const handleExtractSymptoms = async () => {
    if (!symptomText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    setUnknownTerms([]);
    try {
      const response = await extractSymptoms(symptomText);
      const { matched_symptoms, unmatched_terms } = response.data;
      if (matched_symptoms.length > 0) {
        setSelectedSymptoms([...new Set([...selectedSymptoms, ...matched_symptoms])]);
      }
      setUnknownTerms(unmatched_terms || []);
      if (matched_symptoms.length === 0) {
        setExtractError("BioBERT could not find any recognizable symptoms. Try selecting from the dropdown.");
      }
    } catch (error) {
      const msg = error.response?.data?.error || "Extraction failed. Try again.";
      setExtractError(msg);
    }
    setExtracting(false);
  };

  const handlePredict = async () => {
    if (!patientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    if (selectedSymptoms.length < 3) {
      alert("Please select at least 3 symptoms for an accurate prediction.");
      return;
    }
    setLoading(true);
    try {
      const response = await predictDisease({
        patient_name: patientName.trim(),
        symptoms: selectedSymptoms,
      });
      setResult(response.data);
      loadHistory();
    } catch (error) {
      const msg = error.response?.data?.error || "Prediction failed. Please check backend server.";
      alert(msg);
    }
    setLoading(false);
  };

  const handleClear = () => {
    setPatientName("");
    setSelectedSymptoms([]);
    setSymptomText("");
    setUnknownTerms([]);
    setExtractError(null);
    setResult(null);
  };

  // Show auth page if not logged in
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <div className="hero-section">
        <div className="hero-icon">🏥</div>
        <h1>Medical Symptoms Disease Prediction System</h1>
        <p className="subtitle">Disease Prediction & Clinical Decision Support System</p>

        {/* User info + logout */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "12px" }}>
          <span style={{ color: "#64748b", fontSize: "14px" }}>
            👤 Logged in as <strong>{user}</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 16px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600"
            }}
          >
            Logout
          </button>
        </div>

        <div className="feature-badges" style={{ marginTop: "16px" }}>
          <span>📋 Symptom Analysis</span>
          <span>🧬 BioBERT Extraction</span>
          <span>🩺 Specialist Recommendation</span>
          <span>⚠️ Risk Assessment</span>
          <span>📊 Confidence Score</span>
        </div>
      </div>

      <div className="card">
        <h2>Enter Patient Details</h2>
        <input
          type="text"
          placeholder="Enter patient name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
        <textarea
          placeholder="Describe your symptoms in natural language, e.g. I have been feeling feverish with joint pain and nausea"
          value={symptomText}
          onChange={(e) => setSymptomText(e.target.value)}
        />
        <button
          className="extract-btn"
          onClick={handleExtractSymptoms}
          disabled={extracting || !symptomText.trim()}
        >
          {extracting ? "🧬 BioBERT Analyzing Text..." : "🧬 Extract Symptoms with BioBERT"}
        </button>

        {extractError && <p className="warning">{extractError}</p>}
        {unknownTerms.length > 0 && (
          <p className="warning">
            These terms were not matched: {unknownTerms.join(", ")}. Please select from the dropdown.
          </p>
        )}

        <select onChange={handleSymptomChange} defaultValue="">
          <option value="" disabled>Select symptoms</option>
          {symptoms.map((symptom, index) => (
            <option key={index} value={symptom}>{symptom}</option>
          ))}
        </select>

        <div className="selected-symptoms">
          {selectedSymptoms.map((symptom, index) => (
            <span key={index} className="symptom-tag">
              {symptom}
              <button onClick={() => removeSymptom(symptom)}>x</button>
            </span>
          ))}
        </div>

        {selectedSymptoms.length > 0 && selectedSymptoms.length < 3 && (
          <p className="warning">
            Select at least {3 - selectedSymptoms.length} more symptom(s) for accurate prediction.
          </p>
        )}

        <button className="predict-btn" onClick={handlePredict} disabled={loading}>
          {loading ? "AI Analyzing Symptoms..." : "Predict Disease"}
        </button>
        <button className="clear-btn" onClick={handleClear}>Clear Form</button>
      </div>

      {result && (
        <div className="card result">
          <h2>📊 Prediction Result</h2>
          <div className="result-grid">
            <div className="result-box">
              <span>Predicted Disease</span>
              <strong>{result.predicted_disease}</strong>
              {result.is_overridden && (
                <span style={{ color: "#d97706", fontSize: "12px", display: "block", marginTop: "4px" }}>
                  ⚠️ Custom Match (Outside ML Dataset)
                </span>
              )}
            </div>
            <div className="result-box">
              <span>Recommended Specialist</span>
              <strong>{result.specialist}</strong>
            </div>
            <div className="result-box">
              <span>Severity Score</span>
              <strong>{result.severity_score}</strong>
            </div>
            <div className="result-box">
              <span>Risk Level</span>
              <strong className={`risk-badge ${result.risk_level?.toLowerCase()}`}>
                {result.risk_level}
              </strong>
            </div>
          </div>

          <div className="result-box">
            <span>Confidence Score</span>
            <strong>{Number(result.confidence_score).toFixed(2)}%</strong>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Number(result.confidence_score)}%` }} />
            </div>
          </div>

          {result.top_predictions && result.top_predictions.length > 1 && (
            <div className="description-card" style={{ marginTop: 20 }}>
              <h3>🔍 Top Predictions</h3>
              {result.top_predictions.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span>{i + 1}. {p.disease}</span>
                  <strong>{p.confidence}%</strong>
                </div>
              ))}
            </div>
          )}

          <p style={{ marginTop: 16 }}>
            <strong>Severity Advice:</strong> {result.severity_advice}
          </p>

          <div className="description-card">
            <h3>📖 Disease Information</h3>
            <p>{result.description}</p>
          </div>

          <div className="precaution-card">
            <h3>💊 Recommended Precautions</h3>
            <div className="precaution-grid">
              {result.precautions?.split(",").filter((item) => item.trim() !== "").map((item, index) => (
                <div key={index} className="precaution-chip">✅ {item.trim()}</div>
              ))}
            </div>
          </div>

          <p className="disclaimer">
            Disclaimer: This system provides preliminary health guidance only. Please consult a qualified doctor for medical diagnosis.
          </p>
        </div>
      )}

      <div className="card">
        <h2>📊 Prediction History</h2>
        {history.length === 0 ? (
          <p>No prediction history available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Disease</th>
                <th>Confidence</th>
                <th>Specialist</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.patient_name}</td>
                  <td>{item.predicted_disease}</td>
                  <td>{Number(item.confidence_score).toFixed(2)}%</td>
                  <td>{item.specialist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
