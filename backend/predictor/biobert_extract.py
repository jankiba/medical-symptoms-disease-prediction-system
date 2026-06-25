from difflib import SequenceMatcher

_ner_pipeline = None

def get_pipeline():
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            from transformers import pipeline
            _ner_pipeline = pipeline(
                "ner",
                model="d4data/biomedical-ner-all",
                aggregation_strategy="simple"
            )
        except Exception as e:
            print(f"BioBERT not available: {e}")
            _ner_pipeline = "unavailable"
    return _ner_pipeline if _ner_pipeline != "unavailable" else None


def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


COLLOQUIAL_MAP = {
    "feverish": "fever",
    "fever": "high fever",
    "nauseous": "nausea",
    "dizzy": "dizziness",
    "fatigue": "fatigue",
    "tired": "fatigue",
    "tiredness": "fatigue",
    "sleepy": "lethargy",
    "sleepiness": "lethargy",
    "pains": "pain",
    "painful": "pain",
    "headaches": "headache",
    "coughing": "cough",
    "sneezing": "sneezing",
    "stomachache": "stomach pain",
    "stomach ache": "stomach pain",
    "belly ache": "belly pain",
    "heartattack": "heart attack",
    "breathless": "breathlessness",
    "itching": "itching",
    "itchy": "itching",
    "vomit": "vomiting",
    "vomits": "vomiting",
    "heartbeat": "palpitations",
    "racing heartbeat": "palpitations",
    "pounding heartbeat": "palpitations",
    "rapid heartbeat": "palpitations",
    "tightness": "chest pain",
    "chest tightness": "chest pain",
    "shortness of breath": "breathlessness",
    "unable to get enough air": "breathlessness",
    "trembling": "shivering",
    "shaking": "shivering",
    "lightheadedness": "dizziness",
    "faint": "dizziness",
    "feeling faint": "dizziness",
    "hot flashes": "chills",
    "stomach discomfort": "stomach pain",
    "numbness": "drying and tingling lips",
    "tingling": "drying and tingling lips",
    "anxiety": "anxiety",
    "fear of losing control": "anxiety",
    "impending doom": "anxiety",
}


def merge_adjacent_entities(entities, text):
    if not entities:
        return []
    
    sorted_entities = sorted(entities, key=lambda e: e.get("start", 0))
    merged = []
    
    current = sorted_entities[0]
    for next_entity in sorted_entities[1:]:
        sep = text[current.get("end", 0):next_entity.get("start", 0)]
        if next_entity.get("start", 0) - current.get("end", 0) <= 2 and "\n" not in sep:
            current["word"] = (current["word"] + sep + next_entity["word"]).strip()
            current["end"] = next_entity["end"]
            current["score"] = max(current.get("score", 0), next_entity.get("score", 0))
            if "symptom" in next_entity.get("entity_group", "").lower() or "disorder" in next_entity.get("entity_group", "").lower():
                current["entity_group"] = next_entity["entity_group"]
        else:
            merged.append(current)
            current = next_entity
    merged.append(current)
    return merged


def extract_symptoms_with_biobert(text: str, all_symptoms: list) -> dict:
    try:
        ner = get_pipeline()

        extracted_terms = set()

        if ner is not None:
            raw_entities = ner(text)
            print(f"BioBERT raw entities: {raw_entities}")

            valid_entities = []
            for entity in raw_entities:
                label = entity.get("entity_group", "").upper()
                if any(tag in label for tag in [
                    "SIGN", "SYMP", "DISO", "ANAT", "CHEM", "LIVB", "PROC", "STRUCT", "BIOL", "DISEASE"
                ]):
                    valid_entities.append(entity)

            merged_entities = merge_adjacent_entities(valid_entities, text)
            print(f"BioBERT merged entities: {merged_entities}")

            for entity in merged_entities:
                word = entity.get("word", "").strip().lower()
                if word and len(word) >= 3:
                    extracted_terms.add(word)

        # Hybrid direct keyword matching — works even without BioBERT
        text_lower = text.lower()
        for symptom in all_symptoms:
            if symptom in text_lower:
                extracted_terms.add(symptom)
        for colloquial in COLLOQUIAL_MAP.keys():
            if colloquial in text_lower:
                extracted_terms.add(colloquial)

        print(f"Extracted terms (hybrid): {extracted_terms}")

        if not extracted_terms:
            return {
                "matched": [],
                "unmatched": [],
                "error": "Could not find any medical terms in the text. Try being more descriptive."
            }

        matched = []
        unmatched = []
        threshold = 0.72

        for term in extracted_terms:
            mapped_term = COLLOQUIAL_MAP.get(term, term)
            
            best_match = None
            best_score = 0

            for symptom in all_symptoms:
                score = similarity(mapped_term, symptom)
                
                if mapped_term == symptom:
                    score = 2.0
                elif mapped_term in symptom or symptom in mapped_term:
                    score += 0.3
                    
                if score > best_score:
                    best_score = score
                    best_match = symptom

            if best_score >= threshold and best_match:
                if best_match not in matched:
                    matched.append(best_match)
            else:
                unmatched.append(term)

        return {
            "matched": matched,
            "unmatched": unmatched,
            "error": None
        }

    except Exception as e:
        print(f"BioBERT error: {e}")
        return {
            "matched": [],
            "unmatched": [],
            "error": f"BioBERT error: {str(e)}"
        }