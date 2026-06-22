import os
import json
import joblib
import numpy as np
import pandas as pd

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny

from .models import PredictionHistory
from .serializers import PredictionHistorySerializer
from .utils import get_disease_details, calculate_severity
from .biobert_extract import extract_symptoms_with_biobert

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "model.joblib")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "ml", "symptoms.json")

# Load once at startup
model = joblib.load(MODEL_PATH)
with open(SYMPTOMS_PATH, "r") as f:
    all_symptoms = json.load(f)


def clean_symptom(symptom: str) -> str:
    return symptom.replace("_", " ").strip().lower()


@api_view(["GET"])
@permission_classes([AllowAny])
def get_symptoms(request):
    return Response(all_symptoms)


@api_view(["POST"])
@permission_classes([AllowAny])
def extract_symptoms(request):
    print("REGISTER API HIT")
    """
    NEW ENDPOINT: uses BioBERT to extract symptoms from free text.
    POST /api/extract-symptoms/
    Body: { "text": "I have been feeling feverish with joint pain and nausea" }
    """
    text = request.data.get("text", "").strip()

    if not text:
        return Response(
            {"error": "No text provided."},
            status=status.HTTP_400_BAD_REQUEST
        )

    result = extract_symptoms_with_biobert(text, all_symptoms)

    if result["error"]:
        return Response(
            {"error": result["error"]},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

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
        return Response(
            {"error": "No symptoms provided."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(selected_symptoms) < 3:
        return Response(
            {"error": "Please select at least 3 symptoms for an accurate prediction."},
            status=status.HTTP_400_BAD_REQUEST
        )

    cleaned_symptoms = [clean_symptom(s) for s in selected_symptoms]

    unknown = set(cleaned_symptoms) - set(all_symptoms)
    if unknown:
        print(f"Warning: unknown symptoms: {unknown}")

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

    # Check for custom alternative conditions not covered by the Random Forest model
    alternatives = []
    
    ADDITIONAL_DISEASES = {
        "Panic Attack / Panic Disorder": {
            "symptoms": ["palpitations", "fast heart rate", "chest pain", "breathlessness", "sweating", "dizziness", "chills", "nausea", "shivering", "anxiety"],
            "min_match": 4,
            "description": "A sudden episode of intense fear that triggers severe physical reactions when there is no real danger or apparent cause.",
            "specialist": "Psychiatrist / Psychologist",
            "precautions": ["Practice deep breathing (box breathing)", "Recognize that it is temporary and will pass", "Reduce caffeine and stimulants", "Consult a mental health professional"]
        },
        "Anxiety Disorder": {
            "symptoms": ["anxiety", "restlessness", "fatigue", "lack of concentration", "irritability", "muscle pain", "fast heart rate", "sweating", "dizziness"],
            "min_match": 4,
            "description": "A mental health disorder characterized by feelings of worry, anxiety, or fear that are strong enough to interfere with one's daily activities.",
            "specialist": "Psychiatrist / Therapist",
            "precautions": ["Regular exercise and physical activity", "Avoid alcohol and nicotine", "Practice mindfulness or meditation", "Seek cognitive behavioral therapy (CBT)"]
        },
        "COVID-19 (suspected)": {
            "symptoms": ["cough", "high fever", "breathlessness", "fatigue", "muscle pain", "loss of smell", "throat irritation", "runny nose", "congestion", "chest pain"],
            "min_match": 5,
            "description": "An infectious respiratory disease caused by the SARS-CoV-2 virus, primarily affecting the respiratory system.",
            "specialist": "Pulmonologist / General Physician",
            "precautions": ["Isolate from others", "Wear a mask", "Monitor blood oxygen levels", "Get plenty of rest and hydration"]
        }
    }
    
    for dis_name, dis_info in ADDITIONAL_DISEASES.items():
        matching = [s for s in cleaned_symptoms if s in dis_info["symptoms"]]
        if len(matching) >= dis_info["min_match"]:
            alternatives.append({
                "disease": dis_name,
                "description": dis_info["description"],
                "specialist": dis_info["specialist"],
                "precautions": ", ".join(dis_info["precautions"]),
                "match_count": len(matching),
                "total_symptoms": len(dis_info["symptoms"])
            })
            
    # Sort alternatives by match_count descending
    alternatives = sorted(alternatives, key=lambda x: x["match_count"], reverse=True)

    is_overridden = False
    original_ml_prediction = prediction

    # If top alternative has match_count >= 5, override the primary prediction
    if alternatives and alternatives[0]["match_count"] >= 5:
        alt = alternatives[0]
        prediction = alt["disease"]
        confidence_score = (alt["match_count"] / alt["total_symptoms"]) * 100
        details = {
            "specialist": alt["specialist"],
            "description": alt["description"],
            "precautions": alt["precautions"].split(", ")
        }
        is_overridden = True

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
    response_data["alternatives"] = alternatives
    response_data["is_overridden"] = is_overridden
    response_data["original_ml_prediction"] = original_ml_prediction
    response_data.update(severity)

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_history(request):
    history = PredictionHistory.objects.all().order_by("-created_at")
    serializer = PredictionHistorySerializer(history, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "").strip()
    email = request.data.get("email", "").strip()

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email
    )

    refresh = RefreshToken.for_user(user)
    return Response({
        "message": "Account created successfully.",
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "username": user.username
    }, status=status.HTTP_201_CREATED)