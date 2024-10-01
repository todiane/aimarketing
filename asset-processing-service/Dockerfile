# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the pyproject.toml and poetry.lock files into the container
COPY pyproject.toml poetry.lock /app/

# Install Poetry
RUN pip install poetry

# Install dependencies with Poetry
RUN poetry install --no-root

# Copy the rest of your app's code into the container
COPY . /app

# Run the service when the container launches
CMD ["poetry", "run", "asset-processing-service"]
