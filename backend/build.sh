#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python predictor/ml/train_model.py
python manage.py collectstatic --no-input
python manage.py migrate₹