import os
import json
import random
import pandas as pd
# pyrefly: ignore [missing-import]
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

DATASET_PATH = os.path.join(DATA_DIR, "dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "symptoms.json")



def clean_symptom_name(symptom):
    if not isinstance(symptom, str):
        return symptom
    return symptom.replace("_", " ").strip().lower()


def create_feature_row(disease, row_symptoms, all_symptoms):
    feature_row = {"Disease": disease}

    for symptom in all_symptoms:
        feature_row[symptom] = 1 if symptom in row_symptoms else 0

    return feature_row


def train_model():
    df = pd.read_csv(DATASET_PATH)
    df = df.dropna(subset=["Disease"])

    symptom_columns = [col for col in df.columns if col != "Disease"]

    df["Disease"] = df["Disease"].str.strip()

    for col in symptom_columns:
        df[col] = df[col].apply(clean_symptom_name)

    all_symptoms = set()

    for col in symptom_columns:
        symptoms = df[col].dropna().unique()
        all_symptoms.update(symptoms)

    all_symptoms = sorted(list(all_symptoms))

    print(f"Found {len(all_symptoms)} unique symptoms.")

    binary_rows = []

    for _, row in df.iterrows():
        disease = row["Disease"]

        row_symptoms = [
            row[col]
            for col in symptom_columns
            if pd.notna(row[col])
        ]

        row_symptoms = list(set(row_symptoms))

        # Original full symptom row
        binary_rows.append(
            create_feature_row(disease, row_symptoms, all_symptoms)
        )

        # Data augmentation: create partial symptom rows
        if len(row_symptoms) >= 4:
            for _ in range(3):
                keep_count = random.randint(3, len(row_symptoms))
                partial_symptoms = random.sample(row_symptoms, keep_count)

                binary_rows.append(
                    create_feature_row(disease, partial_symptoms, all_symptoms)
                )

    training_df = pd.DataFrame(binary_rows)

    X = training_df[all_symptoms]
    y = training_df["Disease"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    model = RandomForestClassifier(
    n_estimators=500,
    max_depth=None,      # remove the max_depth=15 limit
    min_samples_split=2, # change from 5
    min_samples_leaf=1,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)

    

    model.fit(X_train, y_train)

    train_accuracy = model.score(X_train, y_train)
    y_pred = model.predict(X_test)
    test_accuracy = accuracy_score(y_test, y_pred)

    print(f"Training Accuracy: {train_accuracy * 100:.2f}%")
    print(f"Testing Accuracy: {test_accuracy * 100:.2f}%")

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    joblib.dump(model, MODEL_PATH)

    with open(SYMPTOMS_PATH, "w") as f:
        json.dump(all_symptoms, f, indent=4)

    print("Model training complete.")
    print("Saved model.joblib")
    print("Saved symptoms.json")


if __name__ == "__main__":
    train_model()