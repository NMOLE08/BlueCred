#!/bin/bash

# BlueCred Complete Integration Startup Script
echo "🚀 Starting BlueCred Complete Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}Port $1 is already in use${NC}"
        return 1
    else
        return 0
    fi
}

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    local dir=$4
    
    echo -e "${BLUE}Starting $name on port $port...${NC}"
    
    if check_port $port; then
        cd "$dir"
        eval "$command" &
        local pid=$!
        echo -e "${GREEN}✅ $name started (PID: $pid)${NC}"
        sleep 2
    else
        echo -e "${RED}❌ Cannot start $name - port $port in use${NC}"
    fi
}

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}📁 Working directory: $SCRIPT_DIR${NC}"

# 1. Start Hardhat blockchain network
echo -e "\n${YELLOW}=== Starting Blockchain Network ===${NC}"
start_service "Hardhat Network" "npx hardhat node" "8546" "blue-carbon-registry"

# Wait for blockchain to start
sleep 5

# 2. Deploy smart contracts
echo -e "\n${YELLOW}=== Deploying Smart Contracts ===${NC}"
cd blue-carbon-registry
echo -e "${BLUE}Deploying contracts...${NC}"
npx hardhat run scripts/deploy.js --network localhost
cd ..

# 3. Start blockchain backend
echo -e "\n${YELLOW}=== Starting Blockchain Backend ===${NC}"
start_service "Blockchain Backend" "PORT=5001 node server.js" "5001" "blockchain-backend"

# 4. Start biomass frontend
echo -e "\n${YELLOW}=== Starting Biomass Frontend ===${NC}"
start_service "Biomass Frontend" "FLASK_APP=app.py .venv/bin/flask run --port 5002" "5002" "biomass-frontend-worktree"

# 5. Start React DApp
echo -e "\n${YELLOW}=== Starting React DApp ===${NC}"
start_service "React DApp" "npm start" "3001" "blue-carbon-registry/frontend"

# 6. Start NCCR Website (optional)
echo -e "\n${YELLOW}=== Starting NCCR Website ===${NC}"
start_service "NCCR Website" "python3 -m http.server 8000" "8000" "website"

# 7. Flutter app instructions (manual start)
echo -e "\n${YELLOW}=== Flutter App Instructions ===${NC}"
echo -e "${BLUE}To start Flutter app manually:${NC}"
echo -e "cd blue_carbon_app"
echo -e "flutter pub get"
echo -e "flutter run -d web-server --web-port 8080"

# Summary
echo -e "\n${GREEN}🎉 BlueCred Integration Started!${NC}"
echo -e "\n${YELLOW}=== Access Points ===${NC}"
echo -e "${GREEN}🌐 Biomass Frontend:${NC} http://127.0.0.1:5002"
echo -e "${GREEN}🌐 React DApp:${NC} http://localhost:3001"
echo -e "${GREEN}🌐 Blockchain API:${NC} http://127.0.0.1:5001"
echo -e "${GREEN}🌐 Hardhat Network:${NC} http://127.0.0.1:8546"
echo -e "${GREEN}🌐 NCCR Website:${NC} http://localhost:8000/nccr-authorities.html"
echo -e "${GREEN}🌐 Flutter Web:${NC} http://localhost:8080 (manual start)"

echo -e "\n${YELLOW}=== Next Steps ===${NC}"
echo -e "1. Import MetaMask accounts using Hardhat private keys"
echo -e "2. Test biomass tokenization flow"
echo -e "3. Verify DApp balance updates"
echo -e "4. Check NCCR website functionality"

echo -e "\n${BLUE}Press Ctrl+C to stop all services${NC}"

# Keep script running
wait
