from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import get_symptoms, predict_disease, get_history, extract_symptoms, register_user

urlpatterns = [
    path("symptoms/", get_symptoms),
    path("predict/", predict_disease),
    path("history/", get_history),
    path("extract-symptoms/", extract_symptoms),
    path("auth/register/", register_user),
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
]