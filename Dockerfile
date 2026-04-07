FROM python:3.11-slim

WORKDIR /app

# Install system dependencies + Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright + Chromium
RUN playwright install --with-deps chromium

# Build frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy application code
COPY app/ app/
COPY automation/ automation/

# Remove dev/secret files from container
RUN rm -f .env .gcp-config

ENV PORT=8080
ENV ENVIRONMENT=production
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
