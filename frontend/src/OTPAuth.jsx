import { useState } from "react";
import { loginUser } from "./api";
import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/" });

function OTPAuth({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const startCountdown = () => {
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleRegister = async () => {
        if (!username || !email || !password) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await API.post("auth/register/", { username, email, password });
            setRegisteredEmail(email);
            setMode("otp");
            setSuccess(`OTP sent to ${email}`);
            startCountdown();
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed.");
        }

        setLoading(false);
    };

    const handleLogin = async () => {
        if (!username || !password) {
            setError("Username and password are required.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await loginUser({ username, password });
            const { access, refresh } = response.data;

            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);
            localStorage.setItem("username", username);

            onLogin(username);
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid username or password.");
        }

        setLoading(false);
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpValue = otp.join("");

        if (otpValue.length !== 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await API.post("auth/verify-otp/", {
                email: registeredEmail,
                otp: otpValue
            });

            const { access, refresh, username: uname } = response.data;

            localStorage.setItem("access_token", access);
            localStorage.setItem("refresh_token", refresh);
            localStorage.setItem("username", uname);

            onLogin(uname);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid OTP.");
        }

        setLoading(false);
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;

        setLoading(true);
        setError("");

        try {
            await API.post("auth/resend-otp/", { email: registeredEmail });
            setSuccess("New OTP sent successfully!");
            setOtp(["", "", "", "", "", ""]);
            startCountdown();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to resend OTP.");
        }

        setLoading(false);
    };

    const onForgotPassword = () => {
        setMode("forgot");
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
        setOtp(["", "", "", "", "", ""]);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Email is required.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await API.post("auth/forgot-password/", { email });
            setRegisteredEmail(email);
            setSuccess("OTP sent to your email.");
            setMode("reset");
            setOtp(["", "", "", "", "", ""]);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send OTP.");
        }

        setLoading(false);
    };

    const handleResetPassword = async () => {
        const otpValue = otp.join("");

        if (otpValue.length !== 6 || !password) {
            setError("OTP and new password are required.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await API.post("auth/reset-password/", {
                email: registeredEmail,
                otp: otpValue,
                password: password
            });

            setSuccess("Password reset successful. Please login.");
            setMode("login");
            setPassword("");
            setOtp(["", "", "", "", "", ""]);
        } catch (err) {
            setError(err.response?.data?.error || "Password reset failed.");
        }

        setLoading(false);
    };

    const containerStyle = {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eef2ff, #f8fafc)"
    };

    const cardStyle = {
        background: "white",
        padding: "40px",
        borderRadius: "18px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.1)",
        width: "100%",
        maxWidth: "420px",
        border: "1px solid #e2e8f0"
    };

    const inputStyle = {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid #cbd5e1",
        borderRadius: "10px",
        fontSize: "15px",
        marginBottom: "12px",
        boxSizing: "border-box",
        outline: "none"
    };

    const btnStyle = (color) => ({
        width: "100%",
        padding: "14px",
        background: color,
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "15px",
        fontWeight: "700",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        marginTop: "4px"
    });

    if (mode === "otp") {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                        <div style={{ fontSize: "48px" }}>📧</div>
                        <h2 style={{ color: "#1e293b", margin: "8px 0 4px" }}>Verify Your Email</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                            We sent a 6-digit OTP to<br />
                            <strong>{registeredEmail}</strong>
                        </p>
                    </div>

                    {success && (
                        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", textAlign: "center" }}>
                            {success}
                        </div>
                    )}

                    {error && (
                        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", textAlign: "center" }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "24px" }}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                style={{
                                    width: "48px",
                                    height: "56px",
                                    textAlign: "center",
                                    fontSize: "22px",
                                    fontWeight: "700",
                                    border: "2px solid #cbd5e1",
                                    borderRadius: "10px",
                                    outline: "none",
                                    color: "#1e293b",
                                    background: digit ? "#eff6ff" : "white",
                                    borderColor: digit ? "#2563eb" : "#cbd5e1"
                                }}
                            />
                        ))}
                    </div>

                    <button onClick={handleVerifyOtp} disabled={loading} style={btnStyle("#2563eb")}>
                        {loading ? "Verifying..." : "Verify OTP"}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "16px" }}>
                        <button
                            onClick={handleResendOtp}
                            disabled={countdown > 0 || loading}
                            style={{
                                background: "none",
                                border: "none",
                                color: countdown > 0 ? "#94a3b8" : "#2563eb",
                                cursor: countdown > 0 ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: "600"
                            }}
                        >
                            {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
                        </button>
                    </div>

                    <button
                        onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", width: "100%", marginTop: "12px" }}
                    >
                        ← Back to Register
                    </button>
                </div>
            </div>
        );
    }

    if (mode === "forgot") {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                        <div style={{ fontSize: "48px" }}>🔐</div>
                        <h2 style={{ color: "#1e293b", margin: "8px 0 4px" }}>Forgot Password</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                            Enter your registered email address.
                        </p>
                    </div>

                    {error && (
                        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
                            {error}
                        </div>
                    )}

                    <input
                        type="email"
                        placeholder="Enter registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                    />

                    <button onClick={handleForgotPassword} disabled={loading} style={btnStyle("#2563eb")}>
                        {loading ? "Sending..." : "Send Reset OTP"}
                    </button>

                    <button
                        onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", width: "100%", marginTop: "12px" }}
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (mode === "reset") {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                        <div style={{ fontSize: "48px" }}>🔑</div>
                        <h2 style={{ color: "#1e293b", margin: "8px 0 4px" }}>Reset Password</h2>
                        <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                            Enter OTP sent to<br />
                            <strong>{registeredEmail}</strong>
                        </p>
                    </div>

                    {error && (
                        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
                            {success}
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        value={otp.join("")}
                        onChange={(e) => setOtp(e.target.value.split("").slice(0, 6))}
                        style={inputStyle}
                    />

                    <input
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                    />

                    <button onClick={handleResetPassword} disabled={loading} style={btnStyle("#2563eb")}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>

                    <button
                        onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", width: "100%", marginTop: "12px" }}
                    >
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{ fontSize: "48px" }}>🏥</div>
                    <h1 style={{ fontSize: "22px", color: "#1e293b", margin: "8px 0 4px" }}>Medical Prediction System</h1>
                    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                        {mode === "login" ? "Sign in to your account" : "Create a new account"}
                    </p>
                </div>

                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "4px", marginBottom: "24px" }}>
                    {["login", "register"].map((m) => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                            style={{
                                flex: 1,
                                padding: "10px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                                background: mode === m ? "white" : "transparent",
                                color: mode === m ? "#2563eb" : "#64748b",
                                boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
                            }}
                        >
                            {m === "login" ? "Login" : "Sign Up"}
                        </button>
                    ))}
                </div>

                {error && (
                    <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
                        {success}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                />

                {mode === "register" && (
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={inputStyle}
                    />
                )}

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
                    style={inputStyle}
                />

                <button
                    onClick={mode === "login" ? handleLogin : handleRegister}
                    disabled={loading}
                    style={btnStyle("#2563eb")}
                >
                    {loading ? "Please wait..." : mode === "login" ? "Login" : "Send OTP"}
                </button>

                {mode === "login" && (
                    <button
                        onClick={onForgotPassword}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#3b82f6",
                            cursor: "pointer",
                            fontSize: 13,
                            width: "100%",
                            marginTop: 12
                        }}
                    >
                        Forgot Password?
                    </button>
                )}
            </div>
        </div>
    );
}

export default OTPAuth;