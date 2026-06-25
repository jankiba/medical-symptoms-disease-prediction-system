from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    get_symptoms,
    predict_disease,
    get_history,
    extract_symptoms,
    register_user,
    verify_otp,
    resend_otp,
    forgot_password,
    verify_reset_otp,
    resend_reset_otp,
    reset_password,
)

urlpatterns = [
    # Prediction
    path("symptoms/", get_symptoms),
    path("predict/", predict_disease),
    path("history/", get_history),
    path("extract-symptoms/", extract_symptoms),

    # Registration
    path("auth/register/", register_user),
    path("auth/verify-otp/", verify_otp),
    path("auth/resend-otp/", resend_otp),

    # Login
    path("auth/login/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),

    # Forgot Password
    path("auth/forgot-password/", forgot_password),
    path("auth/verify-reset-otp/", verify_reset_otp),
    path("auth/resend-reset-otp/", resend_reset_otp),
    path("auth/reset-password/", reset_password),
]