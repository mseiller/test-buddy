#!/bin/bash

# Test Buddy Backup and Recovery Script
# Usage: ./backup.sh [backup|restore] [backup-name]

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
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=${2:-"backup_$TIMESTAMP"}

# Load environment configuration
if [ -f "$PROJECT_ROOT/config/production.env" ]; then
    source "$PROJECT_ROOT/config/production.env"
else
    echo "Production environment configuration not found"
    exit 1
fi

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
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
    
    # Check if pg_dump is installed
    if ! command -v pg_dump &> /dev/null; then
        warning "pg_dump is not installed - PostgreSQL backup will be skipped"
    fi
    
    # Check if redis-cli is installed
    if ! command -v redis-cli &> /dev/null; then
        warning "redis-cli is not installed - Redis backup will be skipped"
    fi
    
    success "Prerequisites check passed"
}

# Create backup directory
create_backup_directory() {
    log "Creating backup directory..."
    
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/database"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/redis"
    mkdir -p "$BACKUP_DIR/$BACKUP_DIR/$BACKUP_NAME/kubernetes"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/files"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
    
    success "Backup directory created: $BACKUP_DIR/$BACKUP_NAME"
}

# Backup Kubernetes resources
backup_kubernetes_resources() {
    log "Backing up Kubernetes resources..."
    
    export KUBECONFIG="$KUBECONFIG_PATH"
    
    # Backup all resources in the namespace
    kubectl get all -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/all-resources.yaml"
    
    # Backup specific resource types
    kubectl get deployment -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/deployments.yaml"
    kubectl get service -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/services.yaml"
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/ingress.yaml"
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/configmaps.yaml"
    kubectl get secret -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/secrets.yaml"
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/persistentvolumeclaims.yaml"
    
    # Backup HPA configuration
    kubectl get hpa -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$BACKUP_NAME/kubernetes/horizontalpodautoscalers.yaml"
    
    success "Kubernetes resources backed up"
}

# Backup PostgreSQL database
backup_postgresql() {
    log "Backing up PostgreSQL database..."
    
    if command -v pg_dump &> /dev/null; then
        # Create database dump
        PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --format=custom --verbose --file="$BACKUP_DIR/$BACKUP_NAME/database/postgresql.dump"
        
        # Create SQL dump as well
        PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --format=plain --verbose --file="$BACKUP_DIR/$BACKUP_NAME/database/postgresql.sql"
        
        success "PostgreSQL database backed up"
    else
        warning "pg_dump not available, skipping PostgreSQL backup"
    fi
}

# Backup Redis data
backup_redis() {
    log "Backing up Redis data..."
    
    if command -v redis-cli &> /dev/null; then
        # Save Redis data
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SAVE
        
        # Copy Redis dump file
        if [ -n "$REDIS_PASSWORD" ]; then
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$BACKUP_DIR/$BACKUP_NAME/redis/dump.rdb"
        else
            redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/$BACKUP_NAME/redis/dump.rdb"
        fi
        
        success "Redis data backed up"
    else
        warning "redis-cli not available, skipping Redis backup"
    fi
}

# Backup application files
backup_application_files() {
    log "Backing up application files..."
    
    # Backup logs
    if [ -d "$PROJECT_ROOT/logs" ]; then
        cp -r "$PROJECT_ROOT/logs" "$BACKUP_DIR/$BACKUP_NAME/files/"
    fi
    
    # Backup configuration files
    if [ -d "$PROJECT_ROOT/config" ]; then
        cp -r "$PROJECT_ROOT/config" "$BACKUP_DIR/$BACKUP_NAME/files/"
    fi
    
    # Backup Kubernetes manifests
    if [ -d "$PROJECT_ROOT/k8s" ]; then
        cp -r "$PROJECT_ROOT/k8s" "$BACKUP_DIR/$BACKUP_NAME/files/"
    fi
    
    # Backup Docker files
    if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
        cp "$PROJECT_ROOT/Dockerfile" "$BACKUP_DIR/$BACKUP_NAME/files/"
    fi
    
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/$BACKUP_NAME/files/"
    fi
    
    success "Application files backed up"
}

# Create backup manifest
create_backup_manifest() {
    log "Creating backup manifest..."
    
    cat > "$BACKUP_DIR/$BACKUP_NAME/backup-manifest.json" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "namespace": "$NAMESPACE",
  "components": {
    "kubernetes": true,
    "postgresql": true,
    "redis": true,
    "application_files": true
  },
  "backup_size": "$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)",
  "checksum": "$(find "$BACKUP_DIR/$BACKUP_NAME" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)"
}
EOF
    
    success "Backup manifest created"
}

# Compress backup
compress_backup() {
    log "Compressing backup..."
    
    cd "$BACKUP_DIR"
    tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
    
    # Remove uncompressed directory
    rm -rf "$BACKUP_NAME"
    
    success "Backup compressed: $BACKUP_NAME.tar.gz"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    if [ -n "$BACKUP_RETENTION_DAYS" ]; then
        find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
        success "Old backups cleaned up (retention: $BACKUP_RETENTION_DAYS days)"
    else
        warning "Backup retention not configured, skipping cleanup"
    fi
}

# Restore backup
restore_backup() {
    log "Restoring backup: $BACKUP_NAME"
    
    # Check if backup exists
    if [ ! -f "$BACKUP_DIR/$BACKUP_NAME.tar.gz" ]; then
        error "Backup not found: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    fi
    
    # Extract backup
    log "Extracting backup..."
    cd "$BACKUP_DIR"
    tar -xzf "$BACKUP_NAME.tar.gz"
    
    # Restore Kubernetes resources
    log "Restoring Kubernetes resources..."
    export KUBECONFIG="$KUBECONFIG_PATH"
    
    # Delete existing resources
    kubectl delete all --all -n "$NAMESPACE" --ignore-not-found=true
    
    # Apply backed up resources
    kubectl apply -f "$BACKUP_DIR/$BACKUP_NAME/kubernetes/"
    
    # Wait for resources to be ready
    kubectl wait --for=condition=ready pod -l app=test-buddy -n "$NAMESPACE" --timeout=300s
    
    # Restore PostgreSQL database
    if [ -f "$BACKUP_DIR/$BACKUP_NAME/database/postgresql.dump" ]; then
        log "Restoring PostgreSQL database..."
        PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --clean --if-exists --verbose "$BACKUP_DIR/$BACKUP_NAME/database/postgresql.dump"
        success "PostgreSQL database restored"
    fi
    
    # Cleanup extracted files
    rm -rf "$BACKUP_DIR/$BACKUP_NAME"
    
    success "Backup restored successfully"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    cd "$BACKUP_DIR"
    
    # Check if backup file exists
    if [ ! -f "$BACKUP_NAME.tar.gz" ]; then
        error "Backup file not found: $BACKUP_NAME.tar.gz"
    fi
    
    # Verify checksum
    local expected_checksum=$(cat "$BACKUP_NAME.tar.gz.sha256" 2>/dev/null || echo "")
    if [ -n "$expected_checksum" ]; then
        local actual_checksum=$(sha256sum "$BACKUP_NAME.tar.gz" | cut -d' ' -f1)
        if [ "$expected_checksum" = "$actual_checksum" ]; then
            success "Backup checksum verified"
        else
            error "Backup checksum verification failed"
        fi
    else
        warning "No checksum file found, skipping verification"
    fi
    
    # Test archive integrity
    if tar -tzf "$BACKUP_NAME.tar.gz" > /dev/null 2>&1; then
        success "Backup archive integrity verified"
    else
        error "Backup archive is corrupted"
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    
    if [ -d "$BACKUP_DIR" ]; then
        for backup in "$BACKUP_DIR"/*.tar.gz; do
            if [ -f "$backup" ]; then
                local backup_name=$(basename "$backup" .tar.gz)
                local backup_size=$(du -h "$backup" | cut -f1)
                local backup_date=$(stat -c %y "$backup" | cut -d' ' -f1)
                echo "  $backup_name ($backup_size) - $backup_date"
            fi
        done
    else
        echo "  No backups found"
    fi
}

# Main backup function
backup() {
    log "Starting backup process..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup directory
    create_backup_directory
    
    # Backup components
    backup_kubernetes_resources
    backup_postgresql
    backup_redis
    backup_application_files
    
    # Create manifest and compress
    create_backup_manifest
    compress_backup
    
    # Cleanup old backups
    cleanup_old_backups
    
    success "Backup completed successfully: $BACKUP_NAME.tar.gz"
}

# Main function
main() {
    case "${1:-}" in
        "backup")
            backup
            ;;
        "restore")
            restore_backup
            ;;
        "verify")
            verify_backup
            ;;
        "list")
            list_backups
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [backup|restore|verify|list] [backup-name]"
            echo "Commands:"
            echo "  backup [name]  - Create a new backup"
            echo "  restore [name] - Restore from backup"
            echo "  verify [name]  - Verify backup integrity"
            echo "  list           - List available backups"
            echo "  help           - Show this help message"
            ;;
        *)
            error "Invalid command. Use: backup, restore, verify, list, or help"
            ;;
    esac
}

# Error handling
trap 'error "Backup/restore failed"' ERR

# Run main function
main "$@"
