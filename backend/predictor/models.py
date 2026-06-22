# pyrefly: ignore [missing-import]
from django.db import models


class PredictionHistory(models.Model):
    patient_name = models.CharField(max_length=100)
    symptoms = models.TextField()
    predicted_disease = models.CharField(max_length=100)
    confidence_score = models.FloatField()
    specialist = models.CharField(max_length=100)
    description = models.TextField()
    precautions = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient_name} - {self.predicted_disease}"