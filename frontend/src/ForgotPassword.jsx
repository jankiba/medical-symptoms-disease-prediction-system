import { useState } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://127.0.0.1:8000/api/" });

const C = {
    navy: "#0a0f1e",
    navyCard: "#111827",
    navyMid: "#0d1528",
    navyBorder: "#1e2d45",
    accent: "#3b82f6",
    teal: "#14b8a6",
    green: "#22c55e",
    red: "#ef4444",
    amber: "#f59e0b",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
};

export default function ForgotPassword({ onBack }) {
    const [step, setStep] = useState("email"); // email → otp → reset
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const startCountdown = () => {
        setCountdown(60);
        const t = setInterval(() => {
            setCountdown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; });
        }, 1000);
    };

    const handleSendOtp = async () => {
        if (!email.trim()) { setError("Email is required."); return; }
        setLoading(true); setError("");
        try {
            await API.post("auth/forgot-password/", { email });
            setStep("otp");
            setSuccess(`OTP sent to ${email}`);
            startCountdown();
        } catch (e) {
            setError(e.response?.data?.error || "Email not found.");
        }
        setLoading(false);
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) document.getElementById(`fp-otp-${index + 1}`)?.focus();
    };

    const handleVerifyOtp = async () => {
        const otpValue = otp.join("");
        if (otpValue.length !== 6) { setError("Enter complete 6-digit OTP."); return; }
        setLoading(true); setError("");
        try {
            await API.post("auth/verify-reset-otp/", { email, otp: otpValue });
            setStep("reset");
            setSuccess("OTP verified! Set your new password.");
        } catch (e) {
            setError(e.response?.data?.error || "Invalid OTP.");
        }
        setLoading(false);
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) { setError("Both fields required."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
        setLoading(true); setError("");
        try {
            await API.post("auth/reset-password/", { email, new_password: newPassword });
            setSuccess("Password reset successfully! You can now login.");
            setTimeout(() => onBack(), 2000);
        } catch (e) {
            setError(e.response?.data?.error || "Reset failed.");
        }
        setLoading(false);
    };

    const inputStyle = {
        width: "100%", padding: "12px 16px", background: C.navyMid,
        border: `1px solid ${C.navyBorder}`, borderRadius: 10, color: C.textPrimary,
        fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12
    };

    const btnStyle = (bg) => ({
        width: "100%", padding: 14, background: bg, color: "#fff", border: "none",
        borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1, marginTop: 4
    });

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.navy }}>
            <div style={{ background: C.navyCard, border: `1px solid ${C.navyBorder}`, borderRadius: 18, padding: 40, width: "100%", maxWidth: 420 }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ fontSize: 44, marginBottom: 8 }}>
                        {step === "email" ? "🔑" : step === "otp" ? "📧" : "🔒"}
                    </div>
                    <h2 style={{ color: C.textPrimary, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>
                        {step === "email" ? "Forgot Password" : step === "otp" ? "Verify OTP" : "Reset Password"}
                    </h2>
                    <p style={{ color: C.textSecondary, fontSize: 13, margin: 0 }}>
                        {step === "email" ? "Enter your email to receive an OTP"
                            : step === "otp" ? `OTP sent to ${email}`
                                : "Enter your new password"}
                    </p>
                </div>

                {success && (
                    <div style={{ background: C.green + "22", color: C.green, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                        ✅ {success}
                    </div>
                )}
                {error && (
                    <div style={{ background: C.red + "22", color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                        {error}
                    </div>
                )}

                {step === "email" && (
                    <>
                        <input type="email" placeholder="Enter your email" value={email}
                            onChange={e => setEmail(e.target.value)} style={inputStyle} />
                        <button onClick={handleSendOtp} disabled={loading} style={btnStyle(C.accent)}>
                            {loading ? "Sending..." : "Send OTP"}
                        </button>
                    </>
                )}

                {step === "otp" && (
                    <>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
                            {otp.map((digit, i) => (
                                <input key={i} id={`fp-otp-${i}`} type="text" inputMode="numeric"
                                    maxLength={1} value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => e.key === "Backspace" && !digit && i > 0 && document.getElementById(`fp-otp-${i - 1}`)?.focus()}
                                    style={{
                                        width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                                        border: `2px solid ${digit ? C.accent : C.navyBorder}`, borderRadius: 10,
                                        background: digit ? C.accent + "22" : C.navyMid, color: C.textPrimary, outline: "none"
                                    }} />
                            ))}
                        </div>
                        <button onClick={handleVerifyOtp} disabled={loading} style={btnStyle(C.accent)}>
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        <div style={{ textAlign: "center", marginTop: 12 }}>
                            <button onClick={handleSendOtp} disabled={countdown > 0 || loading}
                                style={{ background: "none", border: "none", color: countdown > 0 ? C.textSecondary : C.accent, cursor: countdown > 0 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
                                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                            </button>
                        </div>
                    </>
                )}

                {step === "reset" && (
                    <>
                        <input type="password" placeholder="New password" value={newPassword}
                            onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
                        <input type="password" placeholder="Confirm new password" value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
                        <button onClick={handleResetPassword} disabled={loading} style={btnStyle(C.green)}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </>
                )}

                <button onClick={onBack}
                    style={{ background: "none", border: "none", color: C.textSecondary, cursor: "pointer", fontSize: 13, width: "100%", marginTop: 16, textAlign: "center" }}>
                    ← Back to Login
                </button>
            </div>
        </div>
    );
}
