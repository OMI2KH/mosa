MOSA FORGE: Enterprise API Documentation

    Version: Enterprise 1.0
    Last Updated: October 2024
    Powered by: Chereka | Founded by Oumer Muktar

https://img.shields.io/badge/API-Enterprise%2520Ready-blue
https://img.shields.io/badge/Auth-Fayda%2520ID%2520Verified-green
https://img.shields.io/badge/Payment-1999%2520ETB%2520Bundle-orange
📋 Table of Contents

    🎯 Overview

    🔐 Authentication

    📱 API Endpoints

    💳 Payment API

    🎓 Learning API

    👨‍🏫 Expert API

    🛡️ Quality API

    📊 Analytics API

    ⚡ Webhooks

    🔒 Rate Limiting

    🚨 Error Handling

    📈 Monitoring

🎯 Overview
Base URL
bash

# Production
https://api.mosaforge.com/v1

# Staging
https://api.staging.mosaforge.com/v1

# Development
https://api.dev.mosaforge.com/v1

API Response Format
json

{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "traceId": "trace_123456789"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}

Error Response Format
json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "faydaId",
        "message": "Fayda ID must be 10 digits"
      }
    ],
    "traceId": "trace_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

🔐 Authentication
Fayda ID Authentication Flow
javascript

// Request: Start Fayda ID Verification
POST /auth/fayda/initiate
{
  "faydaId": "1234567890",
  "phoneNumber": "+251911223344",
  "userType": "student" // or "expert"
}

// Response
{
  "success": true,
  "data": {
    "verificationId": "verif_123456789",
    "expiresAt": "2024-01-15T10:35:00Z",
    "nextStep": "otp_verification"
  }
}

OTP Verification
javascript

// Request: Verify OTP
POST /auth/otp/verify
{
  "verificationId": "verif_123456789",
  "otpCode": "123456",
  "deviceFingerprint": "device_123"
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "faydaId": "1234567890",
      "userType": "student",
      "profileCompleted": false
    }
  }
}

Token Refresh
javascript

// Request: Refresh Access Token
POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "new_access_token...",
    "expiresIn": 3600
  }
}

Headers
bash

# Required Headers for Authenticated Requests
Authorization: Bearer <access_token>
X-API-Version: 1.0.0
X-Client-Type: mobile # mobile, web, admin
X-Device-ID: device_123

📱 API Endpoints
Student Management
Get Student Profile
javascript

GET /students/{studentId}

// Response
{
  "success": true,
  "data": {
    "id": "student_123",
    "faydaId": "1234567890",
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+251911223344",
      "email": "john.doe@example.com"
    },
    "enrollments": [
      {
        "id": "enroll_123",
        "skill": "Forex Trading",
        "expert": "Expert Name",
        "startDate": "2024-01-15",
        "currentPhase": "mindset",
        "progress": 25
      }
    ],
    "metrics": {
      "completionRate": 75,
      "averageRating": 4.5,
      "activeEnrollments": 2
    }
  }
}

Update Student Profile
javascript

PUT /students/{studentId}
{
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "preferences": {
    "notifications": true,
    "language": "amharic"
  }
}

Enrollment Management
Start Course Enrollment
javascript

POST /enrollments/start
{
  "studentId": "student_123",
  "skillId": "skill_forex",
  "paymentMethod": "telebirr",
  "bundleType": "standard_1999"
}

// Response
{
  "success": true,
  "data": {
    "enrollmentId": "enroll_123",
    "expertId": "expert_456",
    "expertName": "Expert Name",
    "startDate": "2024-01-15T10:30:00Z",
    "mindsetPhase": {
      "duration": "4 weeks",
      "cost": "FREE",
      "weeks": [
        {
          "week": 1,
          "topic": "Wealth Consciousness",
          "exercises": 5
        }
      ]
    },
    "nextSteps": "Complete mindset assessment"
  }
}

Get Enrollment Progress
javascript

GET /enrollments/{enrollmentId}/progress

// Response
{
  "success": true,
  "data": {
    "enrollmentId": "enroll_123",
    "currentPhase": "theory",
    "overallProgress": 45,
    "phaseProgress": {
      "mindset": 100,
      "theory": 60,
      "handsOn": 0,
      "certification": 0
    },
    "recentActivities": [
      {
        "date": "2024-01-15",
        "activity": "Completed exercise 5",
        "phase": "theory"
      }
    ]
  }
}

💳 Payment API
Initialize Payment
javascript

POST /payments/initialize
{
  "studentId": "student_123",
  "skillId": "skill_forex",
  "paymentMethod": "telebirr",
  "amount": 1999,
  "currency": "ETB",
  "metadata": {
    "bundleType": "standard_1999",
    "revenueSplit": {
      "mosa": 1000,
      "expert": 999
    }
  }
}

// Response
{
  "success": true,
  "data": {
    "paymentId": "pay_123",
    "paymentUrl": "https://telebirr.com/pay/...",
    "expiresAt": "2024-01-15T11:30:00Z",
    "qrCode": "data:image/png;base64,..."
  }
}

Payment Webhook (for providers)
javascript

POST /webhooks/payments/telebirr
{
  "transactionId": "txn_123",
  "paymentId": "pay_123",
  "status": "completed",
  "amount": 1999,
  "currency": "ETB",
  "timestamp": "2024-01-15T10:35:00Z",
  "metadata": {
    "customerPhone": "+251911223344"
  }
}

Revenue Distribution
javascript

GET /payments/revenue/{expertId}

// Response
{
  "success": true,
  "data": {
    "expertId": "expert_456",
    "totalEarnings": 29970,
    "pendingPayouts": 9990,
    "payoutSchedule": [
      {
        "phase": "upfront",
        "amount": 333,
        "status": "paid",
        "paidAt": "2024-01-15"
      },
      {
        "phase": "milestone",
        "amount": 333,
        "status": "pending",
        "estimatedDate": "2024-02-15"
      }
    ],
    "performanceBonuses": [
      {
        "type": "quality_bonus",
        "amount": 199.8,
        "reason": "Master tier performance"
      }
    ]
  }
}

🎓 Learning API
Get Learning Content
javascript

GET /learning/enrollments/{enrollmentId}/content?phase=mindset&week=1

// Response
{
  "success": true,
  "data": {
    "phase": "mindset",
    "week": 1,
    "topic": "Wealth Consciousness",
    "exercises": [
      {
        "id": "ex_1",
        "type": "reflection",
        "title": "Wealth Mindset Assessment",
        "content": {
          "question": "What does wealth mean to you?",
          "options": [],
          "expectedDuration": 15
        },
        "prerequisites": [],
        "completionStatus": "pending"
      }
    ],
    "progress": {
      "completed": 0,
      "total": 5,
      "percentage": 0
    }
  }
}

Submit Exercise
javascript

POST /learning/exercises/{exerciseId}/submit
{
  "enrollmentId": "enroll_123",
  "answers": {
    "reflection": "Wealth means having the freedom to...",
    "actionItems": ["Identify income opportunities"]
  },
  "timeSpent": 12, // in minutes
  "deviceInfo": {
    "platform": "mobile",
    "version": "1.0.0"
  }
}

// Response
{
  "success": true,
  "data": {
    "exerciseId": "ex_1",
    "status": "completed",
    "score": 95,
    "feedback": "Excellent reflection on wealth mindset",
    "nextExercise": "ex_2",
    "progressUpdate": {
      "phaseProgress": 20,
      "overallProgress": 5
    }
  }
}

Real-time Forex Charts
javascript

GET /learning/forex/charts?pair=EURUSD&timeframe=1h

// Response
{
  "success": true,
  "data": {
    "pair": "EURUSD",
    "timeframe": "1h",
    "data": [
      {
        "timestamp": "2024-01-15T10:00:00Z",
        "open": 1.0950,
        "high": 1.0960,
        "low": 1.0940,
        "close": 1.0955,
        "volume": 1250
      }
    ],
    "technicalIndicators": {
      "sma20": 1.0940,
      "rsi": 58.5,
      "macd": 0.002
    }
  }
}

👨‍🏫 Expert API
Expert Registration
javascript

POST /experts/register
{
  "faydaId": "1234567890",
  "personalInfo": {
    "firstName": "Alex",
    "lastName": "Johnson",
    "phoneNumber": "+251922334455",
    "email": "alex.johnson@example.com"
  },
  "professionalInfo": {
    "skills": ["skill_forex", "skill_design"],
    "certifications": [
      {
        "name": "Forex Trading Certificate",
        "issuer": "Financial Academy",
        "issueDate": "2023-06-01"
      }
    ],
    "portfolio": [
      {
        "type": "project",
        "title": "Trading Strategy Development",
        "description": "Developed profitable trading strategy",
        "outcome": "Consistent 5% monthly returns"
      }
    ]
  },
  "availability": {
    "maxStudents": 25,
    "preferredSchedule": ["weekday_evenings", "weekends"]
  }
}

// Response
{
  "success": true,
  "data": {
    "expertId": "expert_456",
    "status": "pending_verification",
    "estimatedVerificationTime": "2-3 business days",
    "nextSteps": ["portfolio_review", "certificate_verification"]
  }
}

Expert Dashboard
javascript

GET /experts/{expertId}/dashboard

// Response
{
  "success": true,
  "data": {
    "overview": {
      "currentStudents": 15,
      "maxCapacity": 25,
      "completionRate": 82,
      "averageRating": 4.7,
      "tier": "master"
    },
    "earnings": {
      "thisMonth": 14985,
      "pendingPayouts": 4995,
      "performanceBonus": 2997,
      "totalEarnings": 89910
    },
    "qualityMetrics": {
      "overallScore": 4.7,
      "completionRate": 82,
      "responseTime": 4.2, // hours
      "studentSatisfaction": 92
    },
    "recentActivities": [
      {
        "student": "Student Name",
        "activity": "Completed theory phase",
        "timestamp": "2024-01-15T09:00:00Z"
      }
    ]
  }
}

Student Roster Management
javascript

GET /experts/{expertId}/students?status=active

// Response
{
  "success": true,
  "data": {
    "students": [
      {
        "studentId": "student_123",
        "name": "John Doe",
        "skill": "Forex Trading",
        "enrollmentDate": "2024-01-01",
        "currentPhase": "theory",
        "progress": 60,
        "lastActivity": "2024-01-15T08:30:00Z",
        "nextSession": "2024-01-16T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15
    }
  }
}

🛡️ Quality API
Quality Metrics
javascript

GET /quality/experts/{expertId}/metrics

// Response
{
  "success": true,
  "data": {
    "expertId": "expert_456",
    "overallScore": 4.7,
    "tier": "master",
    "metrics": {
      "completionRate": 82,
      "averageRating": 4.7,
      "responseTime": 4.2,
      "studentSatisfaction": 92,
      "progressRate": 88
    },
    "thresholds": {
      "master": 4.7,
      "senior": 4.3,
      "standard": 4.0
    },
    "improvementAreas": [
      {
        "area": "response_time",
        "current": 4.2,
        "target": 3.5,
        "suggestion": "Implement faster response system"
      }
    ]
  }
}

Quality Enforcement
javascript

POST /quality/enforcements
{
  "expertId": "expert_456",
  "action": "auto_pause",
  "reason": "quality_threshold_breach",
  "metrics": {
    "currentScore": 3.8,
    "threshold": 4.0,
    "breachDuration": "72h"
  }
}

// Response
{
  "success": true,
  "data": {
    "enforcementId": "enf_123",
    "action": "auto_pause",
    "effectiveFrom": "2024-01-15T10:00:00Z",
    "duration": "7 days",
    "conditionsForLift": [
      "quality_score_above_4.0",
      "completion_rate_above_70"
    ]
  }
}

📊 Analytics API
Platform Analytics
javascript

GET /analytics/platform/overview?period=30d

// Response
{
  "success": true,
  "data": {
    "period": "30d",
    "enrollments": {
      "total": 1250,
      "active": 890,
      "completed": 275,
      "completionRate": 72
    },
    "revenue": {
      "total": 2498750,
      "mosaShare": 1249375,
      "expertShare": 1249375,
      "averagePerStudent": 1999
    },
    "quality": {
      "averageExpertRating": 4.3,
      "studentSatisfaction": 85,
      "completionRate": 72
    },
    "skills": {
      "mostPopular": ["Forex Trading", "Graphic Design", "Web Development"],
      "completionRates": {
        "Forex Trading": 75,
        "Graphic Design": 68,
        "Web Development": 72
      }
    }
  }
}

Expert Performance Analytics
javascript

GET /analytics/experts/{expertId}/performance?period=90d

// Response
{
  "success": true,
  "data": {
    "expertId": "expert_456",
    "period": "90d",
    "overview": {
      "studentsEnrolled": 45,
      "studentsCompleted": 37,
      "completionRate": 82,
      "averageRating": 4.7
    },
    "earnings": {
      "total": 44955,
      "baseEarnings": 37462,
      "bonuses": 7493,
      "averagePerStudent": 999
    },
    "qualityTrend": [
      {
        "month": "2024-01",
        "score": 4.7,
        "tier": "master"
      }
    ]
  }
}

⚡ Webhooks
Webhook Configuration
javascript

POST /webhooks/subscribe
{
  "url": "https://your-callback.com/webhooks/mosa",
  "events": [
    "payment.completed",
    "enrollment.started",
    "quality.alert"
  ],
  "secret": "your_webhook_secret"
}

Webhook Payload Example
javascript

POST https://your-callback.com/webhooks/mosa
{
  "event": "payment.completed",
  "data": {
    "paymentId": "pay_123",
    "studentId": "student_123",
    "amount": 1999,
    "currency": "ETB",
    "completedAt": "2024-01-15T10:35:00Z"
  },
  "timestamp": "2024-01-15T10:35:00Z",
  "signature": "sha256=..."
}

Available Webhook Events

    payment.completed - Payment successfully processed

    enrollment.started - Student started course

    enrollment.completed - Student completed course

    quality.alert - Quality threshold breached

    expert.tier_changed - Expert tier updated

    certification.issued - Certificate generated

🔒 Rate Limiting
Rate Limit Headers
http

X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642242600
Retry-After: 60

Rate Limits by Endpoint
Endpoint	Limit	Window	User Type
/auth/*	10	1 minute	All
/payments/*	100	1 hour	Student
/learning/*	1000	1 hour	Student
/experts/*	500	1 hour	Expert
/analytics/*	100	1 hour	Admin
🚨 Error Handling
Common Error Codes
javascript

const ERROR_CODES = {
  // Authentication Errors
  AUTH_INVALID_TOKEN: 'Invalid or expired token',
  AUTH_MISSING_CREDENTIALS: 'Missing authentication credentials',
  AUTH_FayDA_VERIFICATION_FAILED: 'Fayda ID verification failed',
  
  // Payment Errors
  PAYMENT_INSUFFICIENT_FUNDS: 'Insufficient funds',
  PAYMENT_PROCESSING_FAILED: 'Payment processing failed',
  PAYMENT_DUPLICATE_TRANSACTION: 'Duplicate payment detected',
  
  // Enrollment Errors
  ENROLLMENT_DUPLICATE: 'Duplicate enrollment detected',
  ENROLLMENT_EXPERT_UNAVAILABLE: 'No qualified experts available',
  ENROLLMENT_PAYMENT_REQUIRED: 'Payment required for enrollment',
  
  // Quality Errors
  QUALITY_THRESHOLD_BREACH: 'Quality threshold breached',
  QUALITY_EXpert_SUSPENDED: 'Expert account suspended',
  
  // System Errors
  SYSTEM_MAINTENANCE: 'System under maintenance',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INTERNAL_SERVER_ERROR: 'Internal server error'
};

Error Response Example
javascript

{
  "success": false,
  "error": {
    "code": "ENROLLMENT_EXPERT_UNAVAILABLE",
    "message": "No qualified experts available for this skill at the moment",
    "details": [
      {
        "field": "skillId",
        "message": "Forex Trading experts are currently at capacity"
      }
    ],
    "suggestions": [
      "Try enrolling in a different skill",
      "Check back in 24-48 hours",
      "Contact support for assistance"
    ],
    "traceId": "trace_123456789",
    "timestamp": "2024-01-15T10:30:00Z",
    "documentation": "https://docs.mosaforge.com/errors/ENROLLMENT_EXPERT_UNAVAILABLE"
  }
}

📈 Monitoring
Health Check
javascript

GET /health

// Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "payment_gateway": "healthy",
    "fayda_api": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": 45.2,
    "response_time": 125
  }
}

API Status
javascript

GET /status

// Response
{
  "status": "operational",
  "incidents": [],
  "maintenance": {
    "scheduled": false,
    "nextMaintenance": "2024-02-01T02:00:00Z"
  },
  "performance": {
    "averageResponseTime": 150,
    "uptime": 99.95,
    "errorRate": 0.12
  }
}

🚀 SDKs & Client Libraries
JavaScript/Node.js
bash

npm install @mosaforge/javascript-sdk

javascript

import { MosaForge } from '@mosaforge/javascript-sdk';

const client = new MosaForge({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Example usage
const enrollment = await client.enrollments.start({
  studentId: 'student_123',
  skillId: 'skill_forex'
});

Python
bash

pip install mosaforge-python-sdk

python

from mosaforge import MosaForge

client = MosaForge(api_key='your_api_key', environment='production')

enrollment = client.enrollments.start(
    student_id='student_123',
    skill_id='skill_forex'
)

🔗 Support & Resources

    Documentation: https://docs.mosaforge.com

    API Status: https://status.mosaforge.com

    Support Email: api-support@mosaforge.com

    Developer Forum: https://community.mosaforge.com

📄 License

Mosa Forge Enterprise API
© 2024 Oumer Muktar. Powered by Chereka. All rights reserved.

Proprietary API - Licensed for enterprise use.
Ethiopian Innovation - Built for Ethiopia, scaling to Africa.

Last Updated: October 2024
API Version: Enterprise 1.0
Founder: Oumer Muktar
Powered By: Chereka