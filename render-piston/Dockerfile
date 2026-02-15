FROM ghcr.io/engineer-man/piston:latest

# Expose port 2000
EXPOSE 2000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:2000/api/v2/piston/runtimes || exit 1
