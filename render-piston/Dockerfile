FROM ghcr.io/engineer-man/piston:latest

# Create writable directories for Piston
RUN mkdir -p /tmp/piston /tmp/isolate && \
    chmod 777 /tmp/piston /tmp/isolate

# Set environment variables to use tmp directories
ENV PISTON_PATH=/tmp/piston
ENV PISTON_RUNTIME_PATH=/tmp/piston/runtimes

# Expose port 2000
EXPOSE 2000

# Use tmpfs for writable directories
VOLUME ["/tmp/piston", "/tmp/isolate"]
