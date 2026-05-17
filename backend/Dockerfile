FROM python:3.11-slim

WORKDIR /app

# RUN sudo sed -i 's/deb.debian.org/mirrors.cloud.tencent.com/g' /etc/apt/sources.list
# RUN sudo sed -i 's/security.debian.org/mirrors.cloud.tencent.com/g' /etc/apt/sources.list

RUN echo "deb http://mirrors.cloud.tencent.com/debian/ trixie main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb http://mirrors.cloud.tencent.com/debian/ trixie-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.cloud.tencent.com/debian-security/ trixie-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list

RUN rm /etc/apt/sources.list.d/debian.sources

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    python3-dev \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure pip and uv to use Tsinghua mirror
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
ENV UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency files first (for better layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies globally to the system Python environment
RUN uv pip install --system --no-cache -r pyproject.toml

# EvalScope: always resolve to the newest matching release on PyPI at build time (lock may pin older).
RUN uv pip install --system --no-cache --upgrade "evalscope>=1.5.1"

# Record image build time as “engine last updated” (read by /api/v1/system/evalscope).
RUN date -u +%Y-%m-%dT%H:%M:%SZ > /app/evalscope_engine_updated_at

# NLTK data for BLEU / tokenization (EvalScope metrics; avoids punkt_tab missing at runtime)
RUN mkdir -p /usr/local/share/nltk_data \
    && python -c "import nltk; \
        nltk.download('punkt_tab', download_dir='/usr/local/share/nltk_data', quiet=True); \
        nltk.download('punkt', download_dir='/usr/local/share/nltk_data', quiet=True)"
ENV NLTK_DATA=/usr/local/share/nltk_data

# Copy project files
COPY ./app ./app
COPY ./scripts ./scripts

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    EVALSCOPE_OUTPUT_DIR=/workspace/outputs \
    EVALSCOPE_DATASET_DIR=/workspace/datasets

# Create directories for EvalScope outputs
RUN mkdir -p /workspace/outputs /workspace/datasets

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
RUN chown -R appuser:appuser /app /workspace

# Copy entrypoint scripts
COPY ./scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ./scripts/celery-entrypoint.sh /usr/local/bin/celery-entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/celery-entrypoint.sh

USER appuser

# Run the application with entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
