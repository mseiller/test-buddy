#!/bin/bash

# Test Buddy Deployment Script
# Usage: ./deploy.sh [environment] [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging
LOG_FILE="$PROJECT_ROOT/logs/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"
mkdir -p "$PROJECT_ROOT/logs"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        error "docker is not installed"
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        warning "helm is not installed - some features may not work"
    fi
    
    success "Prerequisites check passed"
}

# Load environment configuration
load_environment_config() {
    log "Loading environment configuration for $ENVIRONMENT..."
    
    if [ ! -f "$PROJECT_ROOT/config/$ENVIRONMENT.env" ]; then
        error "Environment configuration file not found: config/$ENVIRONMENT.env"
    fi
    
    source "$PROJECT_ROOT/config/$ENVIRONMENT.env"
    success "Environment configuration loaded"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    # Check required environment variables
    required_vars=(
        "KUBECONFIG_PATH"
        "DOCKER_REGISTRY"
        "NAMESPACE"
        "DOMAIN"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    success "Configuration validation passed"
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    cd "$PROJECT_ROOT"
    
    # Build image
    log "Building Docker image..."
    docker build -t "$DOCKER_REGISTRY/test-buddy:$VERSION" .
    docker build -t "$DOCKER_REGISTRY/test-buddy:latest" .
    
    # Push image
    log "Pushing Docker image..."
    docker push "$DOCKER_REGISTRY/test-buddy:$VERSION"
    docker push "$DOCKER_REGISTRY/test-buddy:latest"
    
    success "Docker image built and pushed successfully"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log "Deploying to Kubernetes..."
    
    # Set kubectl context
    export KUBECONFIG="$KUBECONFIG_PATH"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply secrets and configmaps
    log "Applying secrets and configmaps..."
    kubectl apply -f "$PROJECT_ROOT/k8s/" -n "$NAMESPACE"
    
    # Update deployment with new image
    log "Updating deployment with version $VERSION..."
    kubectl set image deployment/test-buddy test-buddy="$DOCKER_REGISTRY/test-buddy:$VERSION" -n "$NAMESPACE"
    
    # Wait for rollout
    log "Waiting for deployment rollout..."
    kubectl rollout status deployment/test-buddy -n "$NAMESPACE" --timeout=300s
    
    success "Deployment completed successfully"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Wait for pods to be ready
    log "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=test-buddy -n "$NAMESPACE" --timeout=300s
    
    # Check application health
    log "Checking application health..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "https://$DOMAIN/health" > /dev/null; then
            success "Application health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Health check failed after $max_attempts attempts"
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f "package.json" ] && grep -q "test:smoke" package.json; then
        npm run test:smoke -- --base-url="https://$DOMAIN"
        success "Smoke tests passed"
    else
        warning "Smoke tests not configured, skipping..."
    fi
}

# Monitor deployment
monitor_deployment() {
    log "Monitoring deployment..."
    
    # Check pod status
    kubectl get pods -n "$NAMESPACE" -l app=test-buddy
    
    # Check service status
    kubectl get svc -n "$NAMESPACE"
    
    # Check ingress status
    kubectl get ingress -n "$NAMESPACE"
    
    # Show logs for recent deployments
    log "Recent deployment logs:"
    kubectl logs -n "$NAMESPACE" -l app=test-buddy --tail=50
    
    success "Deployment monitoring completed"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    export KUBECONFIG="$KUBECONFIG_PATH"
    
    # Get previous deployment
    local previous_version=$(kubectl rollout history deployment/test-buddy -n "$NAMESPACE" --output=jsonpath='{.items[0].revision}')
    
    if [ -n "$previous_version" ]; then
        kubectl rollout undo deployment/test-buddy -n "$NAMESPACE" --to-revision="$previous_version"
        kubectl rollout status deployment/test-buddy -n "$NAMESPACE" --timeout=300s
        success "Rollback completed successfully"
    else
        error "No previous deployment found for rollback"
    fi
}

# Cleanup old images
cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove local images older than 7 days
    docker image prune -f --filter "until=168h"
    
    # Remove dangling images
    docker image prune -f
    
    success "Docker cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment to $ENVIRONMENT environment"
    log "Version: $VERSION"
    log "Timestamp: $TIMESTAMP"
    
    # Check prerequisites
    check_prerequisites
    
    # Load and validate configuration
    load_environment_config
    validate_config
    
    # Build and push image
    build_and_push_image
    
    # Deploy to Kubernetes
    deploy_to_kubernetes
    
    # Run health checks
    run_health_checks
    
    # Run smoke tests
    run_smoke_tests
    
    # Monitor deployment
    monitor_deployment
    
    # Cleanup
    cleanup_old_images
    
    success "Deployment to $ENVIRONMENT completed successfully!"
    log "Deployment log saved to: $LOG_FILE"
}

# Error handling
trap 'error "Deployment failed. Check logs at: $LOG_FILE"' ERR

# Parse command line arguments
case "${1:-}" in
    "staging"|"production"|"development")
        main
        ;;
    "rollback")
        load_environment_config
        validate_config
        rollback_deployment
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [environment] [version]"
        echo "Environments: staging, production, development"
        echo "Commands: rollback, help"
        echo "Examples:"
        echo "  $0 staging v1.2.3"
        echo "  $0 production latest"
        echo "  $0 rollback"
        ;;
    *)
        error "Invalid environment. Use: staging, production, development, rollback, or help"
        ;;
esac
