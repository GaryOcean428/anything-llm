#!/bin/bash

# Phase 2 Dependency Installation Script
# This script completes the dependency installation for services that couldn't be installed due to network issues

echo "=== Phase 2: Completing Dependency Installation ==="

# Function to install service dependencies with retry
install_service_deps() {
    local service=$1
    local max_retries=3
    local retry=0

    echo "Installing dependencies for $service..."
    
    while [ $retry -lt $max_retries ]; do
        cd "$service" || exit 1
        
        if yarn install --ignore-scripts; then
            echo "✓ Successfully installed $service dependencies"
            cd ..
            return 0
        else
            echo "⚠ Attempt $((retry + 1)) failed for $service"
            retry=$((retry + 1))
            sleep 5
        fi
        cd ..
    done
    
    echo "✗ Failed to install $service dependencies after $max_retries attempts"
    return 1
}

# Function to handle Prisma generation
setup_prisma() {
    echo "Setting up Prisma database schema..."
    cd server || exit 1
    
    if npx prisma generate; then
        echo "✓ Prisma generation successful"
    else
        echo "⚠ Prisma generation failed - may need manual setup"
    fi
    cd ..
}

# Main installation flow
main() {
    echo "Node.js version: $(node --version)"
    echo "Yarn version: $(yarn --version)"
    echo ""
    
    # Try to install collector dependencies (failed earlier due to network)
    if [ ! -d "collector/node_modules" ]; then
        echo "Collector dependencies not found, attempting installation..."
        install_service_deps "collector"
    else
        echo "✓ Collector dependencies already installed"
    fi
    
    # Setup Prisma (failed earlier due to network)
    if [ ! -d "server/node_modules/.prisma" ]; then
        echo "Prisma client not generated, attempting setup..."
        setup_prisma
    else
        echo "✓ Prisma client already generated"
    fi
    
    echo ""
    echo "=== Dependency Status Summary ==="
    echo "Root level: $([ -d "node_modules" ] && echo "✓ Installed" || echo "✗ Missing")"
    echo "Server: $([ -d "server/node_modules" ] && echo "✓ Installed" || echo "✗ Missing")"
    echo "Frontend: $([ -d "frontend/node_modules" ] && echo "✓ Installed" || echo "✗ Missing")"
    echo "Collector: $([ -d "collector/node_modules" ] && echo "✓ Installed" || echo "✗ Missing")"
    echo "Prisma: $([ -d "server/node_modules/.prisma" ] && echo "✓ Generated" || echo "✗ Not generated")"
    
    echo ""
    echo "=== Running Tests to Validate Setup ==="
    yarn test
    
    echo ""
    echo "=== Running Security Audit ==="
    echo "Root level audit:"
    yarn audit --level high || echo "Found vulnerabilities - see output above"
    
    if [ -d "server/node_modules" ]; then
        echo ""
        echo "Server audit:"
        cd server && yarn audit --level high || echo "Found vulnerabilities - see output above"
        cd ..
    fi
    
    if [ -d "frontend/node_modules" ]; then
        echo ""
        echo "Frontend audit:"
        cd frontend && yarn audit --level high || echo "Found vulnerabilities - see output above"
        cd ..
    fi
    
    echo ""
    echo "=== Phase 2 Installation Complete ==="
}

# Execute main function
main "$@"