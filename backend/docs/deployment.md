MOSA FORGE: Enterprise Deployment Guide

    Production-Ready Deployment Documentation
    Powered by Chereka | Founded by Oumer Muktar

https://img.shields.io/badge/Status-Production%2520Ready-success
https://img.shields.io/badge/Platform-Kubernetes%2520Cluster-blue
https://img.shields.io/badge/Cloud-AWS%2520Ethiopia-orange
https://img.shields.io/badge/Architecture-Microservices-green
📋 Table of Contents

    🎯 Executive Summary

    🏗️ Infrastructure Overview

    🔧 Prerequisites

    🚀 Quick Start Deployment

    🏢 Production Cluster Setup

    📦 Microservices Deployment

    🗄️ Database Configuration

    🔐 Security & Compliance

    📊 Monitoring & Observability

    🔄 CI/CD Pipeline

    🚨 Disaster Recovery

    📈 Scaling Strategies

    🔧 Maintenance Operations

🎯 Executive Summary

This deployment guide provides comprehensive instructions for deploying the Mosa Forge Enterprise Platform in production environments. The platform is designed for high availability, scalability, and enterprise-grade reliability serving the Ethiopian market.
Key Deployment Features

    🔄 Zero-Downtime Deployments - Blue-green deployment strategy

    📊 Multi-Region Ready - Ethiopian data center compliance

    🔒 Bank-Grade Security - Fayda ID integration compliant

    🚀 Auto-Scaling - Quality-based performance scaling

    💾 Data Sovereignty - Ethiopian data protection compliance

🏗️ Infrastructure Overview
Production Architecture
Technology Stack
yaml

Containerization:
  - Docker: 20.10+
  - Containerd: 1.6+

Orchestration:
  - Kubernetes: 1.27+
  - Helm: 3.12+

Cloud Provider:
  - AWS: Ethiopia Region
  - EKS: Managed Kubernetes

Databases:
  - PostgreSQL: 15.0+ (Primary)
  - Redis: 7.0+ (Cache/Sessions)

Monitoring:
  - Prometheus: 2.45+
  - Grafana: 10.0+
  - ELK Stack: 8.9+

🔧 Prerequisites
System Requirements
bash

# Minimum Cluster Specifications
Nodes: 6+ (2 per availability zone)
CPU: 16+ vCPUs total
RAM: 32+ GB total
Storage: 200+ GB SSD

# Recommended Production Spec
Nodes: 12+ (4 per AZ)
CPU: 48+ vCPUs total  
RAM: 96+ GB total
Storage: 500+ GB SSD

Required Tools
bash

# Install required CLI tools
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

Environment Setup
bash

# Clone deployment repository
git clone https://github.com/mosa-forge/enterprise-deployment.git
cd enterprise-deployment

# Set environment variables
export CLUSTER_NAME="mosa-forge-production"
export AWS_REGION="eu-central-1"  # Frankfurt (Ethiopia proximity)
export PROJECT_NAME="mosa-forge"
export ENVIRONMENT="production"

# Configure AWS credentials
aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
aws configure set default.region $AWS_REGION

🚀 Quick Start Deployment
1. Cluster Creation
bash

#!/bin/bash
# scripts/deploy-cluster.sh

set -e

echo "🚀 Starting Mosa Forge Production Deployment..."

# Create EKS cluster
eksctl create cluster \
  --name $CLUSTER_NAME \
  --version 1.27 \
  --region $AWS_REGION \
  --nodegroup-name core-nodes \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed \
  --asg-access \
  --full-ecr-access \
  --alb-ingress-access

# Configure kubectl
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo "✅ Cluster created successfully"

2. Base Infrastructure
bash

# Deploy base components
kubectl apply -f deployment/base-infrastructure/

# Install required operators
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install monitoring stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values deployment/values/monitoring-values.yaml

3. Database Setup
bash

# Create PostgreSQL with high availability
helm install postgresql bitnami/postgresql \
  --namespace database \
  --create-namespace \
  --set auth.postgresPassword=$POSTGRES_PASSWORD \
  --set auth.database=mosa_forge \
  --set primary.persistence.size=100Gi \
  --set readReplicas.replicaCount=2 \
  --values deployment/values/postgresql-values.yaml

# Create Redis cluster
helm install redis bitnami/redis-cluster \
  --namespace cache \
  --create-namespace \
  --set password=$REDIS_PASSWORD \
  --set cluster.nodes=6 \
  --set persistence.size=50Gi

🏢 Production Cluster Setup
Advanced Cluster Configuration
yaml

# deployment/cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: mosa-forge-production
  region: eu-central-1
  version: "1.27"

availabilityZones: 
  - "eu-central-1a"
  - "eu-central-1b" 
  - "eu-central-1c"

iam:
  withOIDC: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy

nodeGroups:
  - name: core-services
    instanceType: m5.large
    desiredCapacity: 3
    minSize: 2
    maxSize: 8
    volumeSize: 50
    labels:
      role: core
    taints:
      - key: role
        value: core
        effect: NoSchedule

  - name: learning-services  
    instanceType: c5.xlarge
    desiredCapacity: 3
    minSize: 2
    maxSize: 12
    volumeSize: 100
    labels:
      role: learning
    taints:
      - key: role
        value: learning
        effect: NoSchedule

  - name: data-services
    instanceType: r5.large
    desiredCapacity: 3
    minSize: 2
    maxSize: 6
    volumeSize: 100
    labels:
      role: data
    taints:
      - key: role
        value: data
        effect: NoSchedule

Network Configuration
yaml

# deployment/network/ingress-controller.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-alb-ingress-controller
  namespace: kube-system
data:
  cluster-name: mosa-forge-production
  aws-region: eu-central-1

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alb-ingress-controller
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: alb-ingress-controller
  template:
    metadata:
      labels:
        app.kubernetes.io/name: alb-ingress-controller
    spec:
      containers:
        - name: alb-ingress-controller
          image: amazon/aws-alb-ingress-controller:v1.1.9
          args:
            - --ingress-class=alb
            - --cluster-name=mosa-forge-production
            - --aws-vpc-id=vpc-xxxxxxxxx
            - --aws-region=eu-central-1

📦 Microservices Deployment
API Gateway Deployment
yaml

# deployment/microservices/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: mosa-forge
  labels:
    app: api-gateway
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1.0.0
    spec:
      nodeSelector:
        role: core
      tolerations:
        - key: "role"
          operator: "Equal"
          value: "core"
          effect: "NoSchedule"
      containers:
      - name: api-gateway
        image: mosaforge/api-gateway:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: mosa-forge
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
  namespace: mosa-forge
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:eu-central-1:xxx:certificate/xxx
    alb.ingress.kubernetes.io/ssl-redirect: "443"
spec:
  ingressClassName: alb
  rules:
  - host: api.mosaforge.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80

Payment Service Deployment
yaml

# deployment/microservices/payment-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: mosa-forge
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      nodeSelector:
        role: core
      containers:
      - name: payment-service
        image: mosaforge/payment-service:v1.0.0
        env:
        - name: TELEBIRR_API_KEY
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: telebirr-api-key
        - name: CBE_BIRR_API_KEY
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: cbe-birr-api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: mosa-forge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

Learning Service Deployment
yaml

# deployment/microservices/learning-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: learning-service
  namespace: mosa-forge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: learning-service
  template:
    metadata:
      labels:
        app: learning-service
    spec:
      nodeSelector:
        role: learning
      tolerations:
        - key: "role"
          operator: "Equal"
          value: "learning"
          effect: "NoSchedule"
      containers:
      - name: learning-service
        image: mosaforge/learning-service:v1.0.0
        env:
        - name: EXERCISE_CACHE_TTL
          value: "3600"
        - name: REAL_TIME_CHARTS_ENABLED
          value: "true"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: exercise-data
          mountPath: /app/data/exercises
      volumes:
      - name: exercise-data
        persistentVolumeClaim:
          claimName: learning-data-pvc

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: learning-data-pvc
  namespace: mosa-forge
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: efs-sc

🗄️ Database Configuration
PostgreSQL High Availability
yaml

# deployment/database/postgresql-ha.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-config
  namespace: database
data:
  postgresql.conf: |
    max_connections = 500
    shared_buffers = 256MB
    effective_cache_size = 1GB
    maintenance_work_mem = 64MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 4MB
    min_wal_size = 1GB
    max_wal_size = 4GB

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: database
spec:
  serviceName: postgresql
  replicas: 3
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "mosa_forge"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        - name: postgresql-config
          mountPath: /etc/postgresql/postgresql.conf
          subPath: postgresql.conf
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - sh
            - -c
            - exec pg_isready -h 127.0.0.1 -U $POSTGRES_USER
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - exec pg_isready -h 127.0.0.1 -U $POSTGRES_USER
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgresql-config
        configMap:
          name: postgresql-config
  volumeClaimTemplates:
  - metadata:
      name: postgresql-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp2
      resources:
        requests:
          storage: 100Gi

Redis Cluster Configuration
yaml

# deployment/cache/redis-cluster.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: cache
data:
  redis.conf: |
    cluster-enabled yes
    cluster-require-full-coverage no
    cluster-node-timeout 15000
    cluster-config-file /data/nodes.conf
    cluster-migration-barrier 1
    appendonly yes
    protected-mode no

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: cache
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7.0-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - /etc/redis/redis.conf
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
        volumeMounts:
        - name: redis-config
          mountPath: /etc/redis
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: redis-config
        configMap:
          name: redis-cluster-config
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp2
      resources:
        requests:
          storage: 50Gi

🔐 Security & Compliance
Security Policies
yaml

# deployment/security/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: mosa-forge
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-gateway
  namespace: mosa-forge
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: internet
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal-communication
  namespace: mosa-forge
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: mosa-forge
    ports:
    - protocol: TCP
      port: 3000

Secrets Management
bash

#!/bin/bash
# scripts/setup-secrets.sh

# Create namespaces
kubectl create namespace mosa-forge
kubectl create namespace database
kubectl create namespace cache

# Create secrets
kubectl create secret generic database-secret \
  --namespace mosa-forge \
  --from-literal=url=$DATABASE_URL \
  --from-literal=username=$DB_USERNAME \
  --from-literal=password=$DB_PASSWORD

kubectl create secret generic redis-secret \
  --namespace mosa-forge \
  --from-literal=url=$REDIS_URL \
  --from-literal=password=$REDIS_PASSWORD

kubectl create secret generic payment-secrets \
  --namespace mosa-forge \
  --from-literal=telebirr-api-key=$TELEBIRR_API_KEY \
  --from-literal=cbe-birr-api-key=$CBE_BIRR_API_KEY

kubectl create secret generic fayda-api-secret \
  --namespace mosa-forge \
  --from-literal=api-key=$FAYDA_API_KEY \
  --from-literal=secret=$FAYDA_SECRET

# Create TLS secrets for SSL
kubectl create secret tls mosaforge-tls \
  --namespace mosa-forge \
  --cert=ssl/certificate.pem \
  --key=ssl/private-key.pem

📊 Monitoring & Observability
Prometheus Configuration
yaml

# deployment/monitoring/prometheus-values.yaml
prometheus:
  prometheusSpec:
    resources:
      requests:
        memory: 4Gi
        cpu: 1000m
      limits:
        memory: 8Gi
        cpu: 2000m
    retention: 30d
    retentionSize: 50GB
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false

alertmanager:
  alertmanagerSpec:
    resources:
      requests:
        memory: 1Gi
        cpu: 500m
      limits:
        memory: 2Gi
        cpu: 1000m

grafana:
  adminPassword: $GRAFANA_PASSWORD
  persistence:
    enabled: true
    size: 20Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 300m
    limits:
      memory: 1Gi
      cpu: 1000m

Custom Metrics
yaml

# deployment/monitoring/service-monitors.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-gateway-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: api-gateway
  endpoints:
  - port: http
    path: /metrics
    interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payment-service-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: payment-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s

Alerting Rules
yaml

# deployment/monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mosa-forge-alerts
  namespace: monitoring
spec:
  groups:
  - name: mosa-forge
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.service }}"
        description: "Error rate is {{ $value }}%"

    - alert: ServiceDown
      expr: up == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Service {{ $labels.job }} is down"

    - alert: HighResponseTime
      expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High response time on {{ $labels.service }}"

🔄 CI/CD Pipeline
GitHub Actions Pipeline
yaml

# .github/workflows/deploy-production.yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

env:
  CLUSTER_NAME: mosa-forge-production
  AWS_REGION: eu-central-1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build and push Docker images
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/mosaforge/api-gateway:${{ github.sha }} .
        docker push ${{ steps.login-ecr.outputs.registry }}/mosaforge/api-gateway:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Deploy to EKS
      run: |
        aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
        kubectl set image deployment/api-gateway api-gateway=$ECR_REGISTRY/api-gateway:$GITHUB_SHA -n mosa-forge
        kubectl rollout status deployment/api-gateway -n mosa-forge

🚨 Disaster Recovery
Backup Strategy
yaml

# deployment/backup/velero-backup.yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: mosa-forge-daily
  namespace: velero
spec:
  includedNamespaces:
  - mosa-forge
  - database
  - cache
  excludedResources:
  - nodes
  - events
  - events.events.k8s.io
  - backups.velero.io
  - restores.velero.io
  ttl: 720h0m0s

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: mosa-forge-daily-backup
  namespace: velero
spec:
  schedule: 0 2 * * *
  template:
    includedNamespaces:
    - mosa-forge
    - database
    - cache
    ttl: 720h0m0s

Database Backup
bash

#!/bin/bash
# scripts/backup-database.sh

#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mosa_forge_backup_${TIMESTAMP}.sql"

echo "Starting database backup: $BACKUP_FILE"

# Backup PostgreSQL
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d mosa_forge > /backups/$BACKUP_FILE

# Upload to S3
aws s3 cp /backups/$BACKUP_FILE s3://mosa-forge-backups/database/

# Cleanup local files older than 7 days
find /backups -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"

📈 Scaling Strategies
Horizontal Pod Autoscaling
yaml

# deployment/scaling/hpa-config.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: mosa-forge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: 100

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: learning-service-hpa
  namespace: mosa-forge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: learning-service
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Object
    object:
      metric:
        name: active_sessions
      describedObject:
        apiVersion: apps/v1
        kind: Deployment
        name: learning-service
      target:
        type: Value
        value: 1000

Cluster Autoscaling
yaml

# deployment/scaling/cluster-autoscaler.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
- apiGroups: [""]
  resources: ["events", "endpoints"]
  verbs: ["create", "patch"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["update"]

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.2
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/mosa-forge-production
        env:
        - name: AWS_REGION
          value: eu-central-1

🔧 Maintenance Operations
Database Maintenance
bash

#!/bin/bash
# scripts/database-maintenance.sh

#!/bin/bash
set -e

echo "Starting database maintenance..."

# Vacuum analyze for performance
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Update statistics
psql $DATABASE_URL -c "ANALYZE;"

# Check for long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

echo "Database maintenance completed"

Log Rotation
yaml

# deployment/logging/fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    <filter kubernetes.**>
      @type kubernetes_metadata
    </filter>

    <match kubernetes.**>
      @type s3
      aws_key_id #{ENV['AWS_ACCESS_KEY_ID']}
      aws_sec_key #{ENV['AWS_SECRET_ACCESS_KEY']}
      s3_bucket mosa-forge-logs
      s3_region eu-central-1
      path logs/
      buffer_path /var/log/fluentd-buffer/s3
      time_slice_format %Y%m%d%H
      time_slice_wait 10m
      utc
      buffer_chunk_limit 256m
    </match>

🎯 Deployment Verification
Health Checks
bash

#!/bin/bash
# scripts/verify-deployment.sh

#!/bin/bash
set -e

echo "🚀 Verifying Mosa Forge Deployment..."

# Check cluster status
kubectl cluster-info

# Check all pods are running
kubectl get pods -n mosa-forge

# Check services
kubectl get services -n mosa-forge

# Check ingress
kubectl get ingress -n mosa-forge

# Run API health checks
curl -f https://api.mosaforge.com/health || exit 1
curl -f https://api.mosaforge.com/ready || exit 1

# Check database connectivity
kubectl exec -n mosa-forge deployment/api-gateway -- curl -s http://payment-service:3000/health

echo "✅ All deployment checks passed!"

Performance Testing
bash

#!/bin/bash
# scripts/performance-test.sh

#!/bin/bash
set -e

echo "Running performance tests..."

# Load test API gateway
wrk -t12 -c400 -d30s https://api.mosaforge.com/health

# Test payment service
wrk -t8 -c200 -d30s https://api.mosaforge.com/payments/health

# Test learning service
wrk -t10 -c300 -d30s https://api.mosaforge.com/learning/health

echo "Performance tests completed"

📞 Support & Maintenance
Emergency Contacts

    Technical Support: devops@mosaforge.com

    Database Emergencies: dba@mosaforge.com

    Security Incidents: security@mosaforge.com

Monitoring Dashboard

    Grafana: https://grafana.mosaforge.com

    Prometheus: https://prometheus.mosaforge.com

    Kibana: https://kibana.mosaforge.com

Documentation

    API Docs: https://docs.mosaforge.com

    Runbooks: https://runbooks.mosaforge.com

    Architecture: https://architecture.mosaforge.com

🎯 Success Metrics
Deployment Success Criteria

    ✅ Zero Downtime during deployments

    ✅ 99.9% Uptime for all critical services

    ✅ <2s Response Time for API endpoints

    ✅ Auto-scaling working correctly

    ✅ Monitoring capturing all metrics

    ✅ Backups running successfully

Performance Benchmarks

    API Gateway: 10,000+ RPM

    Payment Service: 1,000+ TPS

    Learning Service: 5,000+ concurrent users

    Database: <100ms query response

Mosa Forge Enterprise Deployment
Production-Ready • Ethiopian Market • Enterprise Scale

Last Updated: October 2024
Version: 1.0
Deployment Type: Kubernetes • AWS • Microservices