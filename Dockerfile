FROM python:3.8-slim AS builder

# Install packages including npm
RUN apt-get update
#RUN apt-get install -y xz-utils
RUN apt-get install -y curl
RUN apt-get install -y git 

# Changing to non-root user early
RUN useradd --create-home appuser
WORKDIR /home/appuser
USER appuser
RUN ls
COPY --chown=appuser api api
copy --chown=appuser webviz-services webviz-services

# Set environment variables
ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN curl -sSL https://install.python-poetry.org | python3 
WORKDIR /home/appuser/api
RUN poetry export --without-hashes -f requirements.txt -o requirements.txt
RUN more requirements.txt
RUN pip install -r requirements.txt

FROM python:3.8-slim

# Changing to non-root user early
RUN useradd --create-home --uid 1234 appuser
USER 1234
WORKDIR /home/appuser

# Set environment variables
ENV PATH="${PATH}:/home/appuser/.local/bin" \
    PYTHONFAULTHANDLER=1
EXPOSE 8000

# Copy over appuser installed Python packages
COPY --chown=appuser --from=builder /home/appuser/.local /home/appuser/.local

COPY --chown=appuser --from=builder /home/appuser/api /home/appuser/api
WORKDIR /home/appuser/api




CMD uvicorn --workers=4 --proxy-headers --forwarded-allow-ips="*"  --host 0.0.0.0 --port 8000 "api.main:app"