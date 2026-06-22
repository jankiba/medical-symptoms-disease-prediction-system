import os
import pandas as pd
from groq import Groq

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "ml", "data")

DESCRIPTION_PATH = os.path.join(DATA_DIR, "symptom_Description.csv")
PRECAUTION_PATH = os.path.join(DATA_DIR, "symptom_precaution.csv")
SEVERITY_PATH = os.path.join(DATA_DIR, "Symptom-severity.csv")


SPECIALIST_MAPPING = {
    "GERD": "Gastroenterologist",
    "Migraine": "Neurologist",
    "Diabetes": "Endocrinologist",
    "Hypertension": "Cardiologist",
    "Heart attack": "Cardiologist",
    "Asthma": "Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Tuberculosis": "Pulmonologist",
    "Malaria": "General Physician",
    "Dengue": "General Physician",
    "Typhoid": "General Physician",
    "Chicken pox": "Dermatologist",
    "Acne": "Dermatologist",
    "Fungal infection": "Dermatologist",
    "Psoriasis": "Dermatologist",
    "Cervical spondylosis": "Orthopedic",
    "Arthritis": "Rheumatologist",
    "Osteoarthristis": "Orthopedic",
    "Urinary tract infection": "Urologist",
    "Jaundice": "Gastroenterologist",
    "Hepatitis A": "Gastroenterologist",
    "Hepatitis B": "Gastroenterologist",
    "Hepatitis C": "Gastroenterologist",
    "Hepatitis D": "Gastroenterologist",
    "Hepatitis E": "Gastroenterologist",
    "Alcoholic hepatitis": "Gastroenterologist",
    "Paralysis (brain hemorrhage)": "Neurologist",
    "AIDS": "Infectious Disease Specialist",
    "Allergy": "Allergist",
}


def get_disease_details(disease):
    specialist = SPECIALIST_MAPPING.get(
        disease,
        "General Physician"
    )

    description = "Description not available."
    precautions = []

    try:
        desc_df = pd.read_csv(DESCRIPTION_PATH)

        matched_desc = desc_df[
            desc_df["Disease"].str.strip().str.lower()
            == disease.strip().lower()
        ]

        if not matched_desc.empty:
            description = matched_desc.iloc[0]["Description"]

    except Exception as e:
        print("Description error:", e)

    try:
        precaution_df = pd.read_csv(PRECAUTION_PATH)

        matched_precaution = precaution_df[
            precaution_df["Disease"].str.strip().str.lower()
            == disease.strip().lower()
        ]

        if not matched_precaution.empty:
            row = matched_precaution.iloc[0]

            precautions = [
                str(row[col])
                for col in matched_precaution.columns
                if col != "Disease" and pd.notna(row[col])
            ]

    except Exception as e:
        print("Precaution error:", e)

    if not precautions:
        precautions = [
            "Consult a qualified doctor",
            "Avoid self-medication",
            "Monitor your symptoms"
        ]

    return {
        "specialist": specialist,
        "description": description,
        "precautions": precautions
    }


def calculate_severity(selected_symptoms):
    total_score = 0

    try:
        severity_df = pd.read_csv(SEVERITY_PATH)

        severity_df["Symptom_clean_underscore"] = (
            severity_df["Symptom"]
            .astype(str)
            .str.strip()
            .str.lower()
        )

        severity_df["Symptom_clean_space"] = (
            severity_df["Symptom"]
            .astype(str)
            .str.strip()
            .str.lower()
            .str.replace("_", " ", regex=False)
        )

        for symptom in selected_symptoms:
            symptom_clean_underscore = (
                symptom.strip()
                .lower()
                .replace(" ", "_")
            )

            symptom_clean_space = (
                symptom.strip()
                .lower()
                .replace("_", " ")
            )

            matched = severity_df[
                (
                    severity_df["Symptom_clean_underscore"]
                    == symptom_clean_underscore
                )
                |
                (
                    severity_df["Symptom_clean_space"]
                    == symptom_clean_space
                )
            ]

            if not matched.empty:
                total_score += int(
                    matched.iloc[0]["weight"]
                )

    except Exception as e:
        print("Severity error:", e)

    if total_score <= 10:
        risk_level = "Low"
        advice = (
            "Monitor your symptoms and take basic precautions."
        )

    elif total_score <= 20:
        risk_level = "Moderate"
        advice = (
            "Consult a doctor if symptoms continue or worsen."
        )

    elif total_score <= 35:
        risk_level = "High"
        advice = (
            "Please consult a doctor as soon as possible."
        )

    else:
        risk_level = "Critical"
        advice = (
            "Seek immediate medical attention."
        )

    return {
        "severity_score": total_score,
        "risk_level": risk_level,
        "severity_advice": advice
    }


def compare_with_groq(symptoms, model_prediction, description, precautions):
    try:
        client = Groq()

        symptoms_text = ", ".join(symptoms)
        precautions_text = ", ".join(precautions)

        prompt = f"""
You are an AI explanation assistant for a medical symptom prediction system.

The system uses a trained Random Forest model based on a Kaggle disease-symptom dataset.

User symptoms:
{symptoms_text}

Random Forest model prediction:
{model_prediction}

Dataset disease description:
{description}

Dataset precautions:
{precautions_text}

Your task:
Do NOT replace the model prediction.
Explain whether the model prediction is reasonable using the symptoms and dataset information.
Keep the explanation short and simple.

Format:
AI Validation:
Prediction Supported: YES
Disease:
Reason:
Suggested Precautions:
Disclaimer: This is not a medical diagnosis. Please consult a qualified doctor.
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=250
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Groq validation unavailable: {str(e)}"