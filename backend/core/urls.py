from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.models import User
from django.http import JsonResponse

def create_admin(request):
    if User.objects.filter(username="admin").exists():
        return JsonResponse({"message": "User already exists"})
    User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="Admin@12345"
    )
    return JsonResponse({"message": "Admin user created"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('predictor.urls')),
    path('create-admin/', create_admin),
]