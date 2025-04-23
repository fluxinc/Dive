# Docker Setup for Dive Application

This directory contains Docker configuration to run both the Vite frontend application and the Python backend server (mcp-host) in Docker containers.

## Requirements

- Docker and Docker Compose installed on your system

## Quick Start

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

2. Run in detached mode (background):
   ```bash
   docker-compose up -d
   ```

3. Stop the containers:
   ```bash
   docker-compose down
   ```

## Accessing the Application

- Frontend: http://localhost:7777
- Backend API: http://localhost:61990

## Development

The Docker Compose configuration is set up for development with hot-reloading:

- Frontend code changes in the `src`, `public`, and `config` directories will be automatically reflected
- Configuration changes to `vite.config.ts` will be picked up
- The database and configuration files are mounted as volumes for persistence

## Structure

- `Dockerfile.frontend` - Builds the Node.js container for the Vite application
- `mcp-host/Dockerfile` - Builds the Python container for the backend server
- `docker-compose.yml` - Orchestrates both containers and sets up networking

## Troubleshooting

If you encounter issues:

1. Check that all required config files exist in the `mcp-host` directory
2. Ensure port 7777 and 61990 are not in use by other applications
3. View logs with `docker-compose logs -f`
4. Check if Docker and Docker Compose are properly installed
5. On Windows, make sure Docker Desktop is running

## Notes

- The frontend container is configured to wait for the backend to start
- Make sure the backend API URL in the frontend configuration matches the exposed port
- Data persistence is handled through volume mounts 