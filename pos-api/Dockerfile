FROM python:3.10

RUN pip install --upgrade pip
WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5100
CMD ["gunicorn", "wsgi:app", "--workers=4", "--bind=0.0.0.0:5100", "--timeout=120"]
