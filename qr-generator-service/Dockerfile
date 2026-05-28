# 1. Use an official lightweight Python runtime as a parent image
FROM python:3.11-slim

# 2. Set the working directory inside the container ecosystem
WORKDIR /app

# 3. Copy application dependency records first to leverage Docker layer caching
# (Even if you don't have a requirements.txt, copying the README works to initialize the layer)
COPY README.md ./

# 4. Install the required image rendering and API routing frameworks
RUN pip install --no-cache-dir flask flask-cors qrcode pillow

# 5. Copy the rest of the local service source code into the container filesystem
COPY . .

# 6. Inform Docker that the container listens on port 5000 at runtime
EXPOSE 5000

# 7. Define the internal command to launch the stateless microservice daemon
CMD ["python", "app.py"]