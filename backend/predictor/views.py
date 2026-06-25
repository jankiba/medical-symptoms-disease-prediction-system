import os
import json
import random
import string
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from django.core.mail import send_mail
from django.contrib.auth.models import User

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PredictionHistory
from .serializers import PredictionHistorySerializer
from .utils import get_disease_details, calculate_severity
from .biobert_extract import extract_symptoms_with_biobert


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "model.joblib")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "ml", "symptoms.json")

model = joblib.load(MODEL_PATH)

with open(SYMPTOMS_PATH, "r") as f:
    all_symptoms = json.load(f)

otp_store = {}
reset_otp_store = {}

PANIC_ATTACK_SYMPTOMS = [
    "palpitations", "chest pain", "breathlessness", "sweating",
    "shivering", "dizziness", "chills", "nausea", "drying and tingling lips",
    "anxiety", "stomach pain"
]


def generate_otp():
    return "".join(random.choices(string.digits, k=6))


def clean_symptom(symptom: str) -> str:
    return symptom.replace("_", " ").strip().lower()


@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    email = request.data.get("email", "").strip()

    if not username or not password or not email:
        return Response({"error": "Username, email and password are required."}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists."}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already registered."}, status=400)

    otp = generate_otp()

    otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "username": username,
        "password": password
    }

    try:
        send_mail(
            subject="Verify your Medical Prediction System account",
            message=f"Hello {username},\n\nYour OTP is: {otp}\n\nValid for 10 minutes.",
            from_email=os.getenv("EMAIL_HOST_USER"),
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=500)

    return Response({"message": f"OTP sent to {email}.", "email": email}, status=200)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get("email", "").strip()
    otp = request.data.get("otp", "").strip()

    if not email or not otp:
        return Response({"error": "Email and OTP are required."}, status=400)

    if email not in otp_store:
        return Response({"error": "No OTP found for this email. Please register again."}, status=400)

    stored = otp_store[email]

    if datetime.now() > stored["expires_at"]:
        del otp_store[email]
        return Response({"error": "OTP has expired. Please register again."}, status=400)

    if stored["otp"] != otp:
        return Response({"error": "Invalid OTP. Please try again."}, status=400)

    user = User.objects.create_user(
        username=stored["username"],
        password=stored["password"],
        email=email
    )

    del otp_store[email]

    refresh = RefreshToken.for_user(user)

    return Response({
        "message": "Account verified successfully.",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "username": user.username
    }, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_otp(request):
    email = request.data.get("email", "").strip()

    if not email or email not in otp_store:
        return Response({"error": "Please register first."}, status=400)

    stored = otp_store[email]
    otp = generate_otp()

    otp_store[email]["otp"] = otp
    otp_store[email]["expires_at"] = datetime.now() + timedelta(minutes=10)

    try:
        send_mail(
            subject="Your new OTP - Medical Prediction System",
            message=f"Hello {stored['username']},\n\nYour new OTP is: {otp}\n\nValid for 10 minutes.",
            from_email=os.getenv("EMAIL_HOST_USER"),
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=500)

    return Response({"message": "New OTP sent successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email", "").strip()

    if not email:
        return Response({"error": "Email is required."}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "No account found with this email."}, status=404)

    otp = generate_otp()

    reset_otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "username": user.username
    }

    try:
        send_mail(
            subject="Reset your password - Medical Prediction System",
            message=f"Hello {user.username},\n\nYour password reset OTP is: {otp}\n\nValid for 10 minutes.",
            from_email=os.getenv("EMAIL_HOST_USER"),
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=500)

    return Response({"message": f"OTP sent to {email}."})


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_reset_otp(request):
    email = request.data.get("email", "").strip()
    otp = request.data.get("otp", "").strip()

    if not email or not otp:
        return Response({"error": "Email and OTP are required."}, status=400)

    if email not in reset_otp_store:
        return Response({"error": "No reset OTP found. Please request again."}, status=400)

    stored = reset_otp_store[email]

    if datetime.now() > stored["expires_at"]:
        del reset_otp_store[email]
        return Response({"error": "OTP expired. Please request again."}, status=400)

    if stored["otp"] != otp:
        return Response({"error": "Invalid OTP."}, status=400)

    return Response({"message": "OTP verified successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_reset_otp(request):
    email = request.data.get("email", "").strip()

    if not email:
        return Response({"error": "Email is required."}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "No account found with this email."}, status=404)

    otp = generate_otp()

    reset_otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "username": user.username
    }

    try:
        send_mail(
            subject="New password reset OTP - Medical Prediction System",
            message=f"Hello {user.username},\n\nYour new password reset OTP is: {otp}\n\nValid for 10 minutes.",
            from_email=os.getenv("EMAIL_HOST_USER"),
            recipient_list=[email],
            fail_silently=False
        )
    except Exception as e:
        return Response({"error": f"Failed to send email: {str(e)}"}, status=500)

    return Response({"message": "New reset OTP sent successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    email = request.data.get("email", "").strip()
    otp = request.data.get("otp", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not otp or not password:
        return Response({"error": "Email, OTP and new password are required."}, status=400)

    if email not in reset_otp_store:
        return Response({"error": "No OTP found. Please request again."}, status=400)

    stored = reset_otp_store[email]

    if datetime.now() > stored["expires_at"]:
        del reset_otp_store[email]
        return Response({"error": "OTP expired. Please request again."}, status=400)

    if stored["otp"] != otp:
        return Response({"error": "Invalid OTP."}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

    user.set_password(password)
    user.save()

    del reset_otp_store[email]

    return Response({"message": "Password reset successfully. You can now login."})


@api_view(["GET"])
@permission_classes([AllowAny])
def get_symptoms(request):
    return Response(all_symptoms)


@api_view(["POST"])
@permission_classes([AllowAny])
def extract_symptoms(request):
    text = request.data.get("text", "").strip()

    if not text:
        return Response({"error": "No text provided."}, status=400)

    result = extract_symptoms_with_biobert(text, all_symptoms)

    if result["error"]:
        return Response({"error": result["error"]}, status=503)

    return Response({
        "matched_symptoms": result["matched"],
        "unmatched_terms": result["unmatched"]
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def predict_disease(request):
    patient_name = request.data.get("patient_name", "Anonymous").strip() or "Anonymous"
    selected_symptoms = request.data.get("symptoms", [])

    if not selected_symptoms:
        return Response({"error": "No symptoms provided."}, status=400)

    if len(selected_symptoms) < 3:
        return Response({"error": "Please select at least 3 symptoms for an accurate prediction."}, status=400)

    cleaned_symptoms = [clean_symptom(s) for s in selected_symptoms]

    # Panic attack rule-based override
    panic_matches = [s for s in cleaned_symptoms if s in PANIC_ATTACK_SYMPTOMS]

    if len(panic_matches) >= 5:
        prediction = "Panic Attack"
        confidence_score = round((len(panic_matches) / len(PANIC_ATTACK_SYMPTOMS)) * 100, 1)
        top_predictions = [{"disease": "Panic Attack", "confidence": confidence_score}]
        details = {
            "specialist": "Psychiatrist",
            "description": "A panic attack is a sudden episode of intense fear that triggers severe physical reactions when there is no real danger or apparent cause. Panic attacks can be very frightening and cause rapid heartbeat, sweating, trembling and shortness of breath.",
            "precautions": [
                "Practice deep breathing exercises",
                "Consult a mental health professional",
                "Avoid caffeine and alcohol",
                "Practice mindfulness and meditation"
            ]
        }
        severity = calculate_severity(selected_symptoms)

        history = PredictionHistory.objects.create(
            patient_name=patient_name,
            symptoms=", ".join(selected_symptoms),
            predicted_disease=prediction,
            confidence_score=confidence_score,
            specialist=details["specialist"],
            description=details["description"],
            precautions=", ".join(details["precautions"])
        )

        serializer = PredictionHistorySerializer(history)
        response_data = serializer.data
        response_data["top_predictions"] = top_predictions
        response_data.update(severity)
        return Response(response_data, status=201)

    # ML model prediction
    input_vector = [1 if sym in cleaned_symptoms else 0 for sym in all_symptoms]
    input_df = pd.DataFrame([input_vector], columns=all_symptoms)

    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    classes = model.classes_

    prob_index = np.where(classes == prediction)[0][0]
    confidence_score = float(probabilities[prob_index] * 100)

    top3_idx = np.argsort(probabilities)[::-1][:3]
    top_predictions = [
        {
            "disease": classes[i],
            "confidence": round(float(probabilities[i] * 100), 1)
        }
        for i in top3_idx
    ]

    details = get_disease_details(prediction)
    severity = calculate_severity(selected_symptoms)

    history = PredictionHistory.objects.create(
        patient_name=patient_name,
        symptoms=", ".join(selected_symptoms),
        predicted_disease=prediction,
        confidence_score=round(confidence_score, 1),
        specialist=details["specialist"],
        description=details["description"],
        precautions=", ".join(details["precautions"])
    )

    serializer = PredictionHistorySerializer(history)
    response_data = serializer.data
    response_data["top_predictions"] = top_predictions
    response_data.update(severity)

    return Response(response_data, status=201)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_history(request):
    history = PredictionHistory.objects.all().order_by("-created_at")
    serializer = PredictionHistorySerializer(history, many=True)
    return Response(serializer.data)