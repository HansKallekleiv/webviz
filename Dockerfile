FROM python:3.8-slim AS poetry

# Install packages including npm
RUN apt-get update
#RUN apt-get install -y xz-utils
#RUN apt-get install -y curl
RUN apt-get install -y git 

# Changing to non-root user early
RUN useradd --create-home appuser
WORKDIR /home/appuser
COPY --chown=appuser api api
copy --chown=appuser webviz-services webviz-services

RUN pip install poetry

WORKDIR /home/appuser/api
#RUN poetry export -f requirements.txt --output requirements.txt
RUN poetry config virtualenvs.create false
RUN poetry install
#RUN pip install -r requirements.txt
EXPOSE 8000

CMD uvicorn --workers=4 --proxy-headers --forwarded-allow-ips="*"  --host 0.0.0.0 --port 8000 "api.main:app"