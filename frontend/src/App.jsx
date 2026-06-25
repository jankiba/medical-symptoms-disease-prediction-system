import { useEffect, useState } from "react";
import { getSymptoms, predictDisease, getHistory, extractSymptoms } from "./api";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import "./App_dark.css";
import OTPAuth from "./OTPAuth";

function cleanSymptom(s) {
  return s.replace(/_/g, " ").trim().toLowerCase();
}

const C = {
  navy: "#0a0f1e",
  navyMid: "#0d1528",
  navyCard: "#111827",
  navyBorder: "#1e2d45",
  accent: "#3b82f6",
  accentGlow: "#60a5fa",
  accentDim: "#1d4ed8",
  teal: "#14b8a6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  crimson: "#7f1d1d",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#475569",
};

const CHART_COLORS = [
  "#3b82f6", "#14b8a6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#22c55e", "#f97316"
];

function NavBar({ user, page, setPage, onLogout }) {
  const tabs = [
    { id: "predict", label: "🩺 Predict" },
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "profile", label: "👤 Profile" },
  ];

  return (
    <nav style={{
      background: C.navyCard,
      borderBottom: `1px solid ${C.navyBorder}`,
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 64,
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 26 }}>🏥</span>
        <span style={{ color: C.textPrimary, fontWeight: 800, fontSize: 18 }}>
          MediPredict
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setPage(t.id)}
            style={{
              padding: "8px 18px",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              background: page === t.id ? C.accent : "transparent",
              color: page === t.id ? "#fff" : C.textSecondary,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: C.textSecondary, fontSize: 14 }}>👤 {user}</span>
        <button
          onClick={onLogout}
          style={{
            padding: "8px 16px",
            background: C.red,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: C.navyCard,
      border: `1px solid ${C.navyBorder}`,
      borderRadius: 16,
      padding: "24px",
      display: "flex",
      alignItems: "center",
      gap: 18
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: color + "22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          color: C.textSecondary,
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {label}
        </div>
        <div style={{
          color: C.textPrimary,
          fontSize: 30,
          fontWeight: 800,
          marginTop: 4
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ history }) {
  const totalPredictions = history.length;
  const avgConfidence = history.length
    ? (history.reduce((s, h) => s + h.confidence_score, 0) / history.length).toFixed(1)
    : 0;

  const highRisk = history.filter(
    h => h.risk_level === "High" || h.risk_level === "Critical"
  ).length;

  const diseaseCounts = {};
  history.forEach(h => {
    diseaseCounts[h.predicted_disease] =
      (diseaseCounts[h.predicted_disease] || 0) + 1;
  });

  const pieData = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const barData = history.slice(-10).map((h, i) => ({
    name: `#${i + 1}`,
    confidence: parseFloat(h.confidence_score),
    disease: h.predicted_disease
  }));

  const specialistCounts = {};
  history.forEach(h => {
    specialistCounts[h.specialist] =
      (specialistCounts[h.specialist] || 0) + 1;
  });

  const specialistData = Object.entries(specialistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <div style={{
      padding: "36px",
      width: "100%",
      maxWidth: "none",
      boxSizing: "border-box"
    }}>
      <h2 style={{
        color: C.textPrimary,
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 28
      }}>
        📊 Analytics Dashboard
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 24,
        marginBottom: 32
      }}>
        <StatCard icon="🔬" label="Total Predictions" value={totalPredictions} color={C.accent} />
        <StatCard icon="📈" label="Avg Confidence" value={`${avgConfidence}%`} color={C.teal} />
        <StatCard icon="⚠️" label="High Risk Cases" value={highRisk} color={C.red} />
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", color: C.textSecondary }}>
          <div style={{ fontSize: 54, marginBottom: 16 }}>📭</div>
          <p>No predictions yet. Make your first prediction to see analytics.</p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24
        }}>
          <div style={{
            background: C.navyCard,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: 16,
            padding: 28
          }}>
            <h3 style={{ color: C.textPrimary, marginTop: 0 }}>
              Disease Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: C.navyCard,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: 16,
            padding: 28
          }}>
            <h3 style={{ color: C.textPrimary, marginTop: 0 }}>
              Last 10 Confidence Scores
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke={C.textMuted} />
                <YAxis stroke={C.textMuted} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="confidence" fill={C.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: C.navyCard,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: 16,
            padding: 28,
            gridColumn: "1 / -1"
          }}>
            <h3 style={{ color: C.textPrimary, marginTop: 0 }}>
              Most Recommended Specialists
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={specialistData} layout="vertical">
                <XAxis type="number" stroke={C.textMuted} />
                <YAxis type="category" dataKey="name" stroke={C.textMuted} width={200} />
                <Tooltip />
                <Bar dataKey="value" fill={C.teal} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{
          background: C.navyCard,
          border: `1px solid ${C.navyBorder}`,
          borderRadius: 16,
          padding: 28,
          marginTop: 24
        }}>
          <h3 style={{ color: C.textPrimary, marginTop: 0 }}>
            My Prediction History
          </h3>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.navyBorder}` }}>
                  {["Patient", "Disease", "Confidence", "Specialist", "Risk", "Date"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      color: C.textSecondary,
                      textAlign: "left"
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr key={item.id} style={{
                    borderBottom: `1px solid ${C.navyBorder}55`,
                    background: i % 2 === 0 ? "transparent" : C.navyMid
                  }}>
                    <td style={{ padding: "14px 16px", color: C.textPrimary }}>
                      {item.patient_name}
                    </td>
                    <td style={{ padding: "14px 16px", color: C.accentGlow }}>
                      {item.predicted_disease}
                    </td>
                    <td style={{ padding: "14px 16px", color: C.green }}>
                      {Number(item.confidence_score).toFixed(1)}%
                    </td>
                    <td style={{ padding: "14px 16px", color: C.textSecondary }}>
                      {item.specialist}
                    </td>
                    <td style={{ padding: "14px 16px", color: C.amber }}>
                      {item.risk_level || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", color: C.textMuted }}>
                      {new Date(item.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Profile({ user, onSave }) {
  const [displayName, setDisplayName] = useState(user);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("displayName", displayName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave(displayName);
  };

  return (
    <div style={{
      padding: "36px",
      width: "100%",
      maxWidth: "none",
      boxSizing: "border-box"
    }}>
      <h2 style={{ color: C.textPrimary, fontSize: 28, fontWeight: 800 }}>
        👤 My Profile
      </h2>

      <div style={{
        background: C.navyCard,
        border: `1px solid ${C.navyBorder}`,
        borderRadius: 16,
        padding: 32,
        width: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.teal})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 12px",
            fontWeight: 800,
            color: "#fff"
          }}>
            {user.charAt(0).toUpperCase()}
          </div>
          <div style={{ color: C.textPrimary, fontWeight: 800, fontSize: 20 }}>
            {user}
          </div>
          <div style={{ color: C.textSecondary, fontSize: 14 }}>
            Medical Prediction System User
          </div>
        </div>

        <label style={{ color: C.textSecondary, fontWeight: 700 }}>
          Display Name
        </label>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            marginTop: 8,
            background: C.navyMid,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: 10,
            color: C.textPrimary,
            fontSize: 15,
            boxSizing: "border-box"
          }}
        />

        {saved && (
          <div style={{
            background: C.green + "22",
            color: C.green,
            padding: "12px",
            borderRadius: 8,
            marginTop: 16
          }}>
            Profile saved successfully.
          </div>
        )}

        <button
          onClick={handleSave}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 14,
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer"
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("username") || null);
  const [page, setPage] = useState("predict");
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

  const loadSymptoms = async () => {
    try {
      const r = await getSymptoms();
      setSymptoms(r.data.map(cleanSymptom));
    } catch { }
  };

  const loadHistory = async () => {
    try {
      const r = await getHistory();
      setHistory(r.data);
    } catch { }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setResult(null);
    setSelectedSymptoms([]);
    setHistory([]);
  };

  const handleSymptomChange = (e) => {
    const s = cleanSymptom(e.target.value);
    if (s && !selectedSymptoms.includes(s)) {
      setSelectedSymptoms([...selectedSymptoms, s]);
    }
    e.target.value = "";
  };

  const handleExtract = async () => {
    if (!symptomText.trim()) return;

    setExtracting(true);
    setExtractError(null);
    setUnknownTerms([]);

    try {
      const r = await extractSymptoms(symptomText);
      const { matched_symptoms, unmatched_terms } = r.data;

      if (matched_symptoms.length > 0) {
        setSelectedSymptoms([...new Set([...selectedSymptoms, ...matched_symptoms])]);
      }

      setUnknownTerms(unmatched_terms || []);

      if (!matched_symptoms.length) {
        setExtractError("No recognizable symptoms found. Try dropdown.");
      }
    } catch (e) {
      setExtractError(e.response?.data?.error || "Extraction failed.");
    }

    setExtracting(false);
  };

  const handlePredict = async () => {
    if (!patientName.trim()) {
      alert("Enter patient name.");
      return;
    }

    if (selectedSymptoms.length < 3) {
      alert("Select at least 3 symptoms.");
      return;
    }

    setLoading(true);

    try {
      const r = await predictDisease({
        patient_name: patientName.trim(),
        symptoms: selectedSymptoms
      });

      setResult(r.data);
      loadHistory();
    } catch (e) {
      alert(e.response?.data?.error || "Prediction failed.");
    }

    setLoading(false);
  };

  const riskColor = (r) =>
    r === "Low" ? C.green :
      r === "Moderate" ? C.amber :
        r === "Critical" ? C.crimson :
          C.red;

  const confColor = (c) =>
    c >= 70 ? C.green :
      c >= 40 ? C.amber :
        C.red;

  if (!user) {
    return <OTPAuth onLogin={setUser} />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: C.navy,
      fontFamily: "'Inter', system-ui, sans-serif",
      width: "100%"
    }}>
      <NavBar user={user} page={page} setPage={setPage} onLogout={handleLogout} />

      {page === "dashboard" && <Dashboard history={history} />}
      {page === "profile" && <Profile user={user} onSave={setUser} />}

      {page === "predict" && (
        <div style={{
          width: "100%",
          maxWidth: "none",
          padding: "36px",
          boxSizing: "border-box"
        }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 style={{
              color: C.textPrimary,
              fontSize: 38,
              fontWeight: 900,
              margin: "0 0 10px"
            }}>
              Medical Symptom Predictor
            </h1>

            <p style={{ color: C.textSecondary, fontSize: 16 }}>
              AI-powered disease prediction using BioBERT + Random Forest
            </p>

            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginTop: 18,
              flexWrap: "wrap"
            }}>
              {["🧬 BioBERT NLP", "🌲 Random Forest", "⚡ 98% Accuracy", "🔒 Secure"].map(b => (
                <span key={b} style={{
                  background: C.accent + "22",
                  color: C.accentGlow,
                  padding: "7px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  border: `1px solid ${C.accent}44`
                }}>
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: C.navyCard,
            border: `1px solid ${C.navyBorder}`,
            borderRadius: 18,
            padding: 36,
            marginBottom: 28,
            width: "100%",
            boxSizing: "border-box"
          }}>
            <h2 style={{
              color: C.textPrimary,
              fontSize: 22,
              fontWeight: 800,
              marginTop: 0,
              marginBottom: 24,
              textAlign: "center"
            }}>
              Patient Details
            </h2>

            <label style={{ color: C.textSecondary, fontWeight: 700 }}>
              PATIENT NAME
            </label>

            <input
              type="text"
              placeholder="Enter patient name"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginTop: 8,
                marginBottom: 20,
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 12,
                color: C.textPrimary,
                fontSize: 16,
                boxSizing: "border-box"
              }}
            />

            <label style={{ color: C.textSecondary, fontWeight: 700 }}>
              DESCRIBE SYMPTOMS
            </label>

            <textarea
              placeholder="e.g. I have high fever with joint pain and nausea..."
              value={symptomText}
              onChange={e => setSymptomText(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginTop: 8,
                marginBottom: 14,
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 12,
                color: C.textPrimary,
                fontSize: 16,
                minHeight: 130,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit"
              }}
            />

            <button
              onClick={handleExtract}
              disabled={extracting || !symptomText.trim()}
              style={{
                width: "100%",
                padding: 15,
                background: extracting ? C.teal + "88" : C.teal,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 800,
                cursor: extracting ? "not-allowed" : "pointer",
                marginBottom: 16
              }}
            >
              {extracting ? "🧬 BioBERT Analyzing..." : "🧬 Extract Symptoms with BioBERT"}
            </button>

            {extractError && (
              <div style={{
                background: C.red + "22",
                color: C.red,
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 14
              }}>
                {extractError}
              </div>
            )}

            {unknownTerms.length > 0 && (
              <div style={{
                background: C.amber + "22",
                color: C.amber,
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 14
              }}>
                Not matched: {unknownTerms.join(", ")}
              </div>
            )}

            <label style={{ color: C.textSecondary, fontWeight: 700 }}>
              ADD SYMPTOMS MANUALLY
            </label>

            <select
              onChange={handleSymptomChange}
              defaultValue=""
              style={{
                width: "100%",
                padding: "14px 16px",
                marginTop: 8,
                marginBottom: 16,
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 12,
                color: C.textPrimary,
                fontSize: 16,
                boxSizing: "border-box"
              }}
            >
              <option value="" disabled>Select a symptom...</option>
              {symptoms.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>

            {selectedSymptoms.length > 0 && (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 18
              }}>
                {selectedSymptoms.map((s, i) => (
                  <span key={i} style={{
                    background: C.accent + "22",
                    color: C.accentGlow,
                    padding: "7px 13px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 700,
                    border: `1px solid ${C.accent}44`
                  }}>
                    {s}
                    <button
                      onClick={() => setSelectedSymptoms(selectedSymptoms.filter(x => x !== s))}
                      style={{
                        marginLeft: 8,
                        background: "none",
                        border: "none",
                        color: C.textSecondary,
                        cursor: "pointer"
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handlePredict}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: 16,
                  background: loading ? C.accentDim : C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 17,
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Analyzing..." : "🔍 Predict Disease"}
              </button>

              <button
                onClick={() => {
                  setPatientName("");
                  setSelectedSymptoms([]);
                  setSymptomText("");
                  setResult(null);
                  setUnknownTerms([]);
                  setExtractError(null);
                }}
                style={{
                  padding: "16px 26px",
                  background: C.navyMid,
                  color: C.textSecondary,
                  border: `1px solid ${C.navyBorder}`,
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {result && (
            <div style={{
              background: C.navyCard,
              border: `1px solid ${C.accent}44`,
              borderRadius: 18,
              padding: 36,
              borderLeft: `5px solid ${C.accent}`,
              width: "100%",
              boxSizing: "border-box"
            }}>
              <h2 style={{ color: C.textPrimary, marginTop: 0 }}>
                📊 Prediction Result
              </h2>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 20
              }}>
                {[
                  { label: "Predicted Disease", value: result.predicted_disease },
                  { label: "Specialist", value: result.specialist },
                  { label: "Severity Score", value: result.severity_score },
                  { label: "Risk Level", value: result.risk_level, color: riskColor(result.risk_level) },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: C.navyMid,
                    border: `1px solid ${C.navyBorder}`,
                    borderRadius: 14,
                    padding: 20
                  }}>
                    <div style={{
                      color: C.textSecondary,
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 8
                    }}>
                      {label}
                    </div>
                    <div style={{
                      color: color || C.textPrimary,
                      fontSize: 20,
                      fontWeight: 900
                    }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 18
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10
                }}>
                  <span style={{ color: C.textSecondary, fontWeight: 800 }}>
                    Confidence Score
                  </span>
                  <span style={{
                    color: confColor(result.confidence_score),
                    fontWeight: 900
                  }}>
                    {Number(result.confidence_score).toFixed(1)}%
                  </span>
                </div>

                <div style={{
                  height: 10,
                  background: C.navyBorder,
                  borderRadius: 999,
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${result.confidence_score}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.teal})`
                  }} />
                </div>
              </div>

              <div style={{ color: C.textSecondary, marginBottom: 18 }}>
                <strong style={{ color: C.textPrimary }}>Severity Advice:</strong>{" "}
                {result.severity_advice}
              </div>

              <div style={{
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 18
              }}>
                <h3 style={{ color: C.accentGlow, marginTop: 0 }}>
                  📖 About this condition
                </h3>
                <p style={{ color: C.textSecondary, lineHeight: 1.7 }}>
                  {result.description}
                </p>
              </div>

              <div style={{
                background: C.navyMid,
                border: `1px solid ${C.navyBorder}`,
                borderRadius: 14,
                padding: 20
              }}>
                <h3 style={{ color: C.teal, marginTop: 0 }}>
                  💊 Recommended Precautions
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10
                }}>
                  {result.precautions?.split(",").filter(p => p.trim()).map((p, i) => (
                    <div key={i} style={{
                      background: C.teal + "11",
                      border: `1px solid ${C.teal}33`,
                      padding: "12px 14px",
                      borderRadius: 10,
                      color: C.textSecondary
                    }}>
                      ✅ {p.trim()}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: C.red + "11",
                border: `1px solid ${C.red}33`,
                padding: "14px 16px",
                borderRadius: 12,
                color: C.red,
                textAlign: "center",
                marginTop: 18
              }}>
                ⚠️ Disclaimer: This is for educational purposes only. Always consult a qualified doctor.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}