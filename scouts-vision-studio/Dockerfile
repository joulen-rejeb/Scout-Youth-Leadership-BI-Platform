# Image API ML (FastAPI). En docker-compose, le projet est monté en volume pour les .pkl et mlops/.
FROM python:3.11-slim

WORKDIR /workspace

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/workspace

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY ml_backend/requirements.txt ./ml_backend/requirements.txt
RUN pip install --no-cache-dir -r ml_backend/requirements.txt

COPY ml_backend ./ml_backend

EXPOSE 5050

CMD ["python", "-m", "uvicorn", "ml_backend.main:app", "--host", "0.0.0.0", "--port", "5050"]
