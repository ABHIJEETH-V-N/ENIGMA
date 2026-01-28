# Build the image
docker build -t enigma .

# Run the container
docker run -d -p 2026:2026 -p 4000:4000 --name enigma-server enigma