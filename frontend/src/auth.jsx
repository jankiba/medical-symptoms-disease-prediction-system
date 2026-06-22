import { useState } from "react";
import { loginUser, registerUser } from "./api";

function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {

        if (!username || !password) {
            setError("Username and password are required.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let response;
            if (isLogin) {
                response = await loginUser({ username, password });
            } else {
                response = await registerUser({ username, password, email });
            }

            const { access, refresh } = response.data;
            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);
            localStorage.setItem("username", username);
            onLogin(username);
        } catch (err) {
            const msg = err.response?.data?.error ||
                err.response?.data?.detail ||
                "Something went wrong. Please try again.";
            setError(msg);
        }

        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #eef2ff, #f8fafc)"
        }}>
            <div style={{
                background: "white",
                padding: "40px",
                borderRadius: "18px",
                boxShadow: "0 12px 30px rgba(15,23,42,0.1)",
                width: "100%",
                maxWidth: "420px",
                border: "1px solid #e2e8f0"
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "30px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "10px" }}>🏥</div>
                    <h1 style={{ fontSize: "24px", color: "#1e293b", margin: "0 0 8px" }}>
                        Medical Prediction System
                    </h1>
                    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                        {isLogin ? "Sign in to your account" : "Create a new account"}
                    </p>
                </div>

                {/* Toggle */}
                <div style={{
                    display: "flex",
                    background: "#f1f5f9",
                    borderRadius: "10px",
                    padding: "4px",
                    marginBottom: "24px"
                }}>
                    <button
                        onClick={() => { setIsLogin(true); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "10px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            background: isLogin ? "white" : "transparent",
                            color: isLogin ? "#2563eb" : "#64748b",
                            boxShadow: isLogin ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
                        }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(""); }}
                        style={{
                            flex: 1,
                            padding: "10px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            background: !isLogin ? "white" : "transparent",
                            color: !isLogin ? "#2563eb" : "#64748b",
                            boxShadow: !isLogin ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
                        }}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <div>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            fontSize: "15px",
                            marginBottom: "12px",
                            boxSizing: "border-box",
                            outline: "none"
                        }}
                    />

                    {!isLogin && (
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "10px",
                                fontSize: "15px",
                                marginBottom: "12px",
                                boxSizing: "border-box",
                                outline: "none"
                            }}
                        />
                    )}

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "10px",
                            fontSize: "15px",
                            marginBottom: "16px",
                            boxSizing: "border-box",
                            outline: "none"
                        }}
                    />

                    {error && (
                        <div style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            marginBottom: "16px"
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            background: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "10px",
                            fontSize: "15px",
                            fontWeight: "700",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Auth;
