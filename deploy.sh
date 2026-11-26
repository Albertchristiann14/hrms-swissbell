#!/bin/bash
# ==============================================================================
# AUTOMATED DOCKER DEPLOYMENT SCRIPT FOR UBUNTU SERVER
# Project: Swiss-Belinn SKA Management System (SIPU)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}       SIPU Management System - Ubuntu Docker Deployment           ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# 1. Check for Docker and Docker Compose
echo -e "\n${YELLOW}[1/6] Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    echo "Run: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose plugin is not installed.${NC}"
    echo "Run: sudo apt-get update && sudo apt-get install docker-compose-plugin -y"
    exit 1
fi
echo -e "${GREEN}Docker and Docker Compose are installed.${NC}"

# 2. Check for .env file
echo -e "\n${YELLOW}[2/6] Verifying environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}.env file not found. Copying from .env.docker.example...${NC}"
    cp .env.docker.example .env
    echo -e "${RED}IMPORTANT: Please update .env with your production domain, keys, and credentials!${NC}"
fi

# 3. Create required host directories
echo -e "\n${YELLOW}[3/6] Preparing directories and permissions...${NC}"
mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         storage/app/public \
         bootstrap/cache \
         database \
         docker/nginx/ssl

# 4. Build and start containers
echo -e "\n${YELLOW}[4/6] Building and starting Docker containers...${NC}"
docker compose pull || true
docker compose up -d --build

# 5. Wait for app container initialization
echo -e "\n${YELLOW}[5/6] Waiting for application container to stabilize...${NC}"
sleep 5

# 6. Verify containers status
echo -e "\n${YELLOW}[6/6] Verifying running containers...${NC}"
docker compose ps

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN} Deployment completed successfully!                                 ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "Helpful commands:"
echo -e "  - View live logs:       ${BLUE}docker compose logs -f${NC}"
echo -e "  - Run artisan command:  ${BLUE}docker compose exec app php artisan <command>${NC}"
echo -e "  - Restart services:     ${BLUE}docker compose restart${NC}"
echo -e "  - Stop all services:    ${BLUE}docker compose down${NC}"
echo -e "===================================================================="
