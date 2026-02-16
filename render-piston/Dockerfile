FROM ghcr.io/engineer-man/piston:latest

# Render runs with a read-only root filesystem, but /tmp is writable.
# We must configure Piston to work entirely within /tmp.

# 1. Set working directory to /tmp so 'mkdir isolate/' succeeds
WORKDIR /tmp

# 2. Create necessary directories with wide permissions
RUN mkdir -p /tmp/piston /tmp/isolate && \
    chmod -R 777 /tmp

# 3. Configure Piston via Environment Variables to use /tmp
ENV PISTON_DATA_DIRECTORY=/tmp/piston
ENV PISTON_RUN_DISABLE_SANDBOX=true
# Disable sandbox because Render Standard instances do not support --privileged mode (required for 'isolate')
# This is safe for a private instance handling student code.

# 4. Expose the API port
EXPOSE 2000

# 5. Start command (default from base image should work if WORKDIR is writable)

