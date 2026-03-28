MOSA FORGE: Enterprise Database Schema

    Production Ready Database Architecture
    Version: Enterprise 1.0 | Powered by Chereka | Founded by Oumer Muktar

https://img.shields.io/badge/PostgreSQL-13+-blue
https://img.shields.io/badge/Prisma-5.0-green
https://img.shields.io/badge/Optimized-Enterprise-brightgreen
📋 Table of Contents

    🎯 Database Overview

    🏗️ Core Schema Design

    👤 User Management

    🎓 Skills & Learning

    👨‍🏫 Expert Network

    💰 Payment System

    🛡️ Quality System

    📊 Analytics

    🔐 Security & Audit

    🚀 Performance Optimization

    📈 Migration Strategy

🎯 Database Overview
Architecture Principles
sql

-- Enterprise Database Design Principles
PRINCIPLE 1: Scalability First - Partitioning & Sharding Ready
PRINCIPLE 2: Data Integrity - Constraints & Validations
PRINCIPLE 3: Performance - Indexing & Query Optimization  
PRINCIPLE 4: Audit Trail - Comprehensive Logging
PRINCIPLE 5: Security - Row Level Security & Encryption

Technology Stack
yaml

Database: PostgreSQL 13+
ORM: Prisma 5.0
Cache: Redis 6+
Search: Elasticsearch 8+
Monitoring: PGAdmin + Custom Dashboards
Backup: Automated + Point-in-Time Recovery

🏗️ Core Schema Design
Database Configuration
sql

-- Enterprise Database Settings
ALTER DATABASE mosa_forge_enterprise SET
  timezone TO 'Africa/Addis_Ababa',
  maintenance_work_mem TO '1GB',
  work_mem TO '256MB',
  shared_buffers TO '4GB';

-- Enable Critical Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

Core Tables Structure
prisma

// 🏗️ ENTERPRISE DATABASE SCHEMA
// schema.prisma - Production Ready

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["filterJson"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

👤 User Management
Users & Authentication
prisma

// 🎯 CORE USER TABLES

model User {
  id                      String    @id @default(uuid())
  faydaId                 String    @unique @db.VarChar(20)
  phoneNumber             String    @unique @db.VarChar(15)
  email                   String?   @unique
  passwordHash            String    @db.VarChar(255)
  
  // Personal Information
  firstName               String    @db.VarChar(100)
  lastName                String    @db.VarChar(100)
  dateOfBirth             DateTime?
  gender                  Gender?
  profilePicture          String?
  
  // Verification Status
  isFaydaVerified         Boolean   @default(false)
  isPhoneVerified         Boolean   @default(false)
  isEmailVerified         Boolean   @default(false)
  verificationLevel       VerificationLevel @default(BASIC)
  
  // Account Status
  status                  UserStatus @default(ACTIVE)
  accountType             AccountType @default(STUDENT)
  lastLoginAt             DateTime?
  
  // Security
  loginAttempts           Int       @default(0)
  lockedUntil             DateTime?
  mfaEnabled              Boolean   @default(false)
  mfaSecret               String?
  
  // Timestamps
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?
  
  // Relations
  student                 Student?
  expert                  Expert?
  admin                   Admin?
  sessions                Session[]
  auditLogs               AuditLog[]
  notifications           Notification[]
  
  // Indexes
  @@index([faydaId, status])
  @@index([phoneNumber, status])
  @@index([createdAt])
  @@index([verificationLevel])
}

model Session {
  id              String   @id @default(uuid())
  userId          String
  token           String   @unique @db.VarChar(512)
  deviceInfo      Json?
  ipAddress       String?  @db.VarChar(45)
  userAgent       String?
  expiresAt       DateTime
  lastActiveAt    DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, expiresAt])
  @@index([token])
  @@map("user_sessions")
}

// 🎯 ENUM DEFINITIONS

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  DELETED
}

enum AccountType {
  STUDENT
  EXPERT
  ADMIN
  SUPER_ADMIN
}

enum VerificationLevel {
  BASIC
  INTERMEDIATE
  ADVANCED
  ENTERPRISE
}

Student Management
prisma

// 🎓 STUDENT MANAGEMENT

model Student {
  id              String   @id @default(uuid())
  userId          String   @unique
  studentCode     String   @unique @db.VarChar(20)
  
  // Educational Background
  educationLevel  EducationLevel?
  previousExperience String? @db.VarChar(500)
  careerGoals     String? @db.VarChar(1000)
  
  // Financial Information
  incomeBracket   IncomeBracket?
  employmentStatus EmploymentStatus?
  
  // Progress Tracking
  totalEnrollments Int     @default(0)
  completedCourses Int     @default(0)
  successRate      Float   @default(0)
  averageRating    Float   @default(0)
  
  // Mindset Assessment
  mindsetScore    Float?
  readinessLevel  ReadinessLevel @default(BEGINNER)
  
  // Relations
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  enrollments     Enrollment[]
  payments        Payment[]
  progressRecords LearningProgress[]
  certifications  Certificate[]
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([studentCode])
  @@index([readinessLevel])
  @@index([successRate])
}

enum EducationLevel {
  PRIMARY
  SECONDARY
  DIPLOMA
  BACHELORS
  MASTERS
  PHD
  OTHER
}

enum IncomeBracket {
  BELOW_1000
  _1000_3000
  _3000_5000
  _5000_10000
  ABOVE_10000
}

enum EmploymentStatus {
  UNEMPLOYED
  STUDENT
  EMPLOYED
  SELF_EMPLOYED
  FREELANCER
}

enum ReadinessLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT_READY
}

🎓 Skills & Learning
Skills Catalog
prisma

// 🛠️ 40 ENTERPRISE SKILLS CATALOG

model Skill {
  id              String   @id @default(uuid())
  code            String   @unique @db.VarChar(10)
  name            String   @db.VarChar(200)
  description     String?  @db.VarChar(1000)
  category        SkillCategory
  
  // Skill Configuration
  difficulty      DifficultyLevel @default(INTERMEDIATE)
  durationMonths  Int      @default(4)
  theoryDuration  Int      @default(2) // Months
  practicalDuration Int    @default(2) // Months
  
  // Pricing & Revenue
  basePrice       Int      @default(1999) // ETB
  mosaRevenue     Int      @default(1000) // ETB
  expertRevenue   Int      @default(999)  // ETB
  
  // Content Structure
  totalExercises  Int      @default(200)
  theoryExercises Int      @default(100)
  practicalExercises Int   @default(80)
  assessmentExercises Int  @default(20)
  
  // Status
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  displayOrder    Int
  
  // Relations
  enrollments     Enrollment[]
  expertSkills    ExpertSkill[]
  exercises       Exercise[]
  skillPackages   SkillPackage[]
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([category, isActive])
  @@index([difficulty, isActive])
  @@unique([code, category])
}

model SkillCategory {
  id              String   @id @default(uuid())
  name            String   @unique @db.VarChar(100)
  description     String?  @db.VarChar(500)
  icon            String?
  displayOrder    Int
  isActive        Boolean  @default(true)
  
  skills          Skill[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SkillPackage {
  id              String   @id @default(uuid())
  skillId         String
  packageType     PackageType
  name            String   @db.VarChar(200)
  description     String?  @db.VarChar(500)
  
  // Package Configuration
  durationWeeks   Int
  totalExercises  Int
  price           Int      // ETB
  features        Json     // Package features as JSON
  
  skill           Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([skillId, packageType])
}

// 🎯 ENUM DEFINITIONS

enum SkillCategory {
  ONLINE_SKILLS
  OFFLINE_SKILLS  
  HEALTH_SPORTS
  BEAUTY_FASHION
}

enum DifficultyLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum PackageType {
  BASIC
  STANDARD
  PREMIUM
  ENTERPRISE
  CUSTOM
}

Learning Management
prisma

// 📚 LEARNING MANAGEMENT SYSTEM

model Enrollment {
  id              String     @id @default(uuid())
  studentId       String
  expertId        String?
  skillId         String
  paymentId       String?
  
  // Enrollment Status
  status          EnrollmentStatus @default(ACTIVE)
  currentPhase    LearningPhase @default(MINDSET)
  progress        Float      @default(0) // Overall progress 0-100
  
  // Timeline
  startDate       DateTime   @default(now())
  expectedEndDate DateTime
  actualEndDate   DateTime?
  
  // Quality Metrics
  studentRating   Float?     // 1-5 stars
  expertRating    Float?     // 1-5 stars
  completionStatus CompletionStatus?
  
  // Financial Tracking
  revenueSplit    Json       // { mosa: 1000, expert: 999 }
  payoutSchedule  Json       // 333/333/333 structure
  bonusesApplied  Json?      // Quality bonuses
  
  // Relations
  student         Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  expert          Expert?    @relation(fields: [expertId], references: [id])
  skill           Skill      @relation(fields: [skillId], references: [id])
  payment         Payment?   @relation(fields: [paymentId], references: [id])
  progressRecords LearningProgress[]
  sessions        TrainingSession[]
  mindsetAssessments MindsetAssessment[]
  
  // Audit
  traceId         String?    @db.VarChar(100)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  @@index([studentId, status])
  @@index([expertId, status])
  @@index([skillId, status])
  @@index([currentPhase, status])
  @@index([createdAt])
}

model LearningProgress {
  id              String       @id @default(uuid())
  enrollmentId    String
  phase           LearningPhase
  week            Int?
  
  // Progress Tracking
  progress        Float        @default(0) // 0-100
  completedExercises Int       @default(0)
  totalExercises  Int
  timeSpent       Int?         // Minutes
  
  // Performance Metrics
  averageScore    Float?
  completionRate  Float?
  lastActivity    DateTime?
  
  // Relations
  enrollment      Enrollment   @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  exerciseAttempts ExerciseAttempt[]
  
  // Timestamps
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  @@unique([enrollmentId, phase])
  @@index([enrollmentId, progress])
}

model Exercise {
  id              String     @id @default(uuid())
  skillId         String
  phase           LearningPhase
  week            Int
  exerciseNumber  Int
  
  // Exercise Content
  title           String     @db.VarChar(200)
  description     String?    @db.VarChar(1000)
  type            ExerciseType
  difficulty      DifficultyLevel @default(INTERMEDIATE)
  content         Json       // Exercise data in JSON format
  solution        Json?      // Solution data
  hints           String[]   // Array of hints
  
  // Metadata
  estimatedTime   Int        // Minutes
  points          Int        @default(10)
  isActive        Boolean    @default(true)
  
  // Relations
  skill           Skill      @relation(fields: [skillId], references: [id], onDelete: Cascade)
  attempts        ExerciseAttempt[]
  
  // Timestamps
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  @@unique([skillId, phase, week, exerciseNumber])
  @@index([skillId, phase, isActive])
}

model ExerciseAttempt {
  id              String     @id @default(uuid())
  progressId      String
  exerciseId      String
  studentId       String
  
  // Attempt Details
  startedAt       DateTime   @default(now())
  completedAt     DateTime?
  timeSpent       Int?       // Seconds
  score           Float?     // 0-100
  isCorrect       Boolean?
  studentAnswer   Json?      // Student's answer in JSON format
  
  // Relations
  progress        LearningProgress @relation(fields: [progressId], references: [id], onDelete: Cascade)
  exercise        Exercise   @relation(fields: [exerciseId], references: [id])
  student         Student    @relation(fields: [studentId], references: [id])
  
  @@index([studentId, exerciseId])
  @@index([progressId, completedAt])
}

// 🎯 ENUM DEFINITIONS

enum EnrollmentStatus {
  PENDING
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum LearningPhase {
  MINDSET
  THEORY
  HANDS_ON
  CERTIFICATION
}

enum ExerciseType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_BLANK
  DRAG_DROP
  CODE_EXERCISE
  CASE_STUDY
  SIMULATION
  PRACTICAL_TASK
}

enum CompletionStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

👨‍🏫 Expert Network
Expert Management
prisma

// 👨‍🏫 EXPERT NETWORK MANAGEMENT

model Expert {
  id              String   @id @default(uuid())
  userId          String   @unique
  expertCode      String   @unique @db.VarChar(20)
  
  // Professional Information
  professionalTitle String @db.VarChar(200)
  bio             String?  @db.VarChar(2000)
  yearsExperience Int
  portfolioLinks  String[]
  
  // Verification & Documents
  identificationFile String? // Government ID
  certificates     String[]  // Certificate files
  portfolioFiles  String[]  // Portfolio evidence
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  
  // Tier System
  tier            ExpertTier @default(STANDARD)
  qualityScore    Float     @default(4.0)
  maxStudents     Int       @default(50)
  currentStudents Int       @default(0)
  
  // Financial Information
  totalEarnings   Float     @default(0) // ETB
  pendingEarnings Float     @default(0) // ETB
  bankAccount     Json?     // Bank account details
  
  // Availability
  isAvailable     Boolean   @default(true)
  availableSlots  Json?     // Weekly availability
  timezone        String    @default("Africa/Addis_Ababa")
  
  // Relations
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expertSkills    ExpertSkill[]
  enrollments     Enrollment[]
  trainingSessions TrainingSession[]
  qualityMetrics  QualityMetric[]
  payouts         Payout[]
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([tier, qualityScore])
  @@index([isVerified, isAvailable])
  @@index([currentStudents, maxStudents])
}

model ExpertSkill {
  id              String   @id @default(uuid())
  expertId        String
  skillId         String
  certificationFile String? // Skill-specific certificate
  
  // Skill Proficiency
  proficiencyLevel ProficiencyLevel @default(INTERMEDIATE)
  yearsExperience Int
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  
  // Performance Metrics
  successRate     Float?    // 0-1
  averageRating   Float?    // 1-5
  totalStudents   Int       @default(0)
  
  // Relations
  expert          Expert    @relation(fields: [expertId], references: [id], onDelete: Cascade)
  skill           Skill     @relation(fields: [skillId], references: [id])
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([expertId, skillId])
  @@index([skillId, proficiencyLevel])
}

// 🎯 ENUM DEFINITIONS

enum ExpertTier {
  DEVELOPING     // < 3.5 rating
  STANDARD       // 4.0+ rating
  SENIOR         // 4.3+ rating  
  MASTER         // 4.7+ rating
}

enum ProficiencyLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

Training Sessions
prisma

// 🏋️ TRAINING SESSION MANAGEMENT

model TrainingSession {
  id              String   @id @default(uuid())
  enrollmentId    String
  expertId        String
  sessionType     SessionType
  
  // Session Details
  title           String   @db.VarChar(200)
  description     String?  @db.VarChar(1000)
  scheduledDate   DateTime
  duration        Int      // Minutes
  meetingLink     String?  // Video conference link
  materials       String[] // File attachments
  
  // Attendance & Participation
  status          SessionStatus @default(SCHEDULED)
  startedAt       DateTime?
  endedAt         DateTime?
  attendance      Json?    // Student attendance data
  participation   Json?    // Participation metrics
  
  // Feedback
  studentFeedback String?  @db.VarChar(1000)
  expertFeedback  String?  @db.VarChar(1000)
  studentRating   Float?   // 1-5
  expertRating    Float?   // 1-5
  
  // Relations
  enrollment      Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  expert          Expert   @relation(fields: [expertId], references: [id])
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([enrollmentId, scheduledDate])
  @@index([expertId, status])
  @@index([scheduledDate, status])
}

enum SessionType {
  ONE_ON_ONE
  GROUP
  WORKSHOP
  PRACTICAL
  ASSESSMENT
}

enum SessionStatus {
  SCHEDULED
  STARTED
  COMPLETED
  CANCELLED
  NO_SHOW
}

💰 Payment System
Payment Management
prisma

// 💰 ENTERPRISE PAYMENT SYSTEM

model Payment {
  id              String   @id @default(uuid())
  studentId       String
  bundleId        String?
  
  // Payment Details
  amount          Int      // ETB
  currency        String   @default("ETB")
  paymentMethod   PaymentMethod
  paymentGateway  PaymentGateway
  gatewayTransactionId String? @db.VarChar(100)
  
  // Status Tracking
  status          PaymentStatus @default(PENDING)
  paidAt          DateTime?
  failedAt        DateTime?
  failureReason   String?  @db.VarChar(500)
  
  // Revenue Distribution
  mosaRevenue     Int      @default(1000) // ETB
  expertRevenue   Int      @default(999)  // ETB
  revenueSplit    Json     // Detailed split information
  
  // Relations
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  bundle          Bundle?  @relation(fields: [bundleId], references: [id])
  enrollments     Enrollment[]
  refunds         Refund[]
  
  // Audit
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([studentId, status])
  @@index([paymentGateway, status])
  @@index([createdAt])
}

model Bundle {
  id              String   @id @default(uuid())
  name            String   @db.VarChar(200)
  description     String?  @db.VarChar(500)
  
  // Pricing
  amount          Int      @default(1999) // ETB
  currency        String   @default("ETB")
  mosaRevenue     Int      @default(1000) // ETB
  expertRevenue   Int      @default(999)  // ETB
  
  // Bundle Configuration
  durationMonths  Int      @default(4)
  includes        String[] // Array of included features
  isActive        Boolean  @default(true)
  
  // Relations
  payments        Payment[]
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Payout {
  id              String   @id @default(uuid())
  expertId        String
  enrollmentId    String
  
  // Payout Details
  amount          Float    // ETB
  phase           PayoutPhase
  scheduledDate   DateTime
  paidAt          DateTime?
  
  // Status
  status          PayoutStatus @default(PENDING)
  paymentMethod   PaymentMethod?
  transactionId   String?  @db.VarChar(100)
  
  // Relations
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)
  enrollment      Enrollment @relation(fields: [enrollmentId], references: [id])
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([expertId, status])
  @@index([scheduledDate, status])
}

model Refund {
  id              String   @id @default(uuid())
  paymentId       String
  studentId       String
  
  // Refund Details
  amount          Float    // ETB
  reason          RefundReason
  status          RefundStatus @default(PENDING)
  processedAt     DateTime?
  
  // Relations
  payment         Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  student         Student  @relation(fields: [studentId], references: [id])
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([paymentId, status])
  @@index([studentId, createdAt])
}

// 🎯 ENUM DEFINITIONS

enum PaymentMethod {
  TELEBIRR
  CBE_BIRR
  BANK_TRANSFER
  CASH
  MOBILE_BANKING
}

enum PaymentGateway {
  TELEBIRR
  CBE_BIRR
  AWASH
  DAShen
  ABYSSINIA
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

enum PayoutPhase {
  START
  MIDPOINT
  COMPLETION
  BONUS
}

enum PayoutStatus {
  PENDING
  SCHEDULED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum RefundReason {
  STUDENT_REQUEST
  QUALITY_ISSUE
  EXPERT_UNAVAILABLE
  TECHNICAL_ISSUE
  DUPLICATE_PAYMENT
  OTHER
}

enum RefundStatus {
  PENDING
  APPROVED
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}

🛡️ Quality System
Quality Management
prisma

// 🛡️ ENTERPRISE QUALITY GUARANTEE SYSTEM

model QualityMetric {
  id              String   @id @default(uuid())
  expertId        String
  enrollmentId    String?
  
  // Quality Scores (1-5 scale)
  communication   Float?
  professionalism Float?
  knowledge       Float?
  punctuality     Float?
  effectiveness   Float?
  
  // Overall Metrics
  overallScore    Float
  completionRate  Float?   // 0-1
  responseTime    Float?   // Hours
  
  // Student Feedback
  studentComments String?  @db.VarChar(2000)
  wouldRecommend  Boolean?
  
  // Status
  isValid         Boolean  @default(true)
  reviewedBy      String?  // Admin ID
  reviewedAt      DateTime?
  
  // Relations
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)
  enrollment      Enrollment? @relation(fields: [enrollmentId], references: [id])
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([expertId, overallScore])
  @@index([overallScore, isValid])
  @@index([createdAt])
}

model QualityEnforcement {
  id              String   @id @default(uuid())
  expertId        String
  triggerType     EnforcementTrigger
  actionType      EnforcementAction
  
  // Enforcement Details
  reason          String   @db.VarChar(500)
  metricsSnapshot Json     // Quality metrics at time of trigger
  effectiveFrom   DateTime
  effectiveUntil  DateTime?
  
  // Status
  status          EnforcementStatus @default(ACTIVE)
  resolvedAt      DateTime?
  resolvedBy      String?  // Admin ID
  resolutionNotes String?  @db.VarChar(1000)
  
  // Relations
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([expertId, status])
  @@index([triggerType, effectiveFrom])
}

model TierHistory {
  id              String   @id @default(uuid())
  expertId        String
  fromTier        ExpertTier
  toTier          ExpertTier
  
  // Change Details
  reason          String   @db.VarChar(500)
  qualityScore    Float
  metricsSnapshot Json
  effectiveDate   DateTime
  
  // Relations
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)
  
  // Timestamps
  createdAt       DateTime @default(now())
  
  @@index([expertId, effectiveDate])
  @@index([fromTier, toTier])
}

// 🎯 ENUM DEFINITIONS

enum EnforcementTrigger {
  QUALITY_SCORE_DROP
  COMPLETION_RATE_LOW
  RESPONSE_TIME_SLOW
  STUDENT_COMPLAINTS
  AUTOMATIC_REVIEW
  MANUAL_REVIEW
}

enum EnforcementAction {
  WARNING
  TIER_DEMOTION
  ENROLLMENT_PAUSE
  MANDATORY_TRAINING
  TEMPORARY_SUSPENSION
  PERMANENT_SUSPENSION
}

enum EnforcementStatus {
  ACTIVE
  RESOLVED
  APPEALED
  CANCELLED
}

📊 Analytics
Business Intelligence
prisma

// 📊 ENTERPRISE ANALYTICS & REPORTING

model PlatformAnalytics {
  id              String   @id @default(uuid())
  date            DateTime @unique // Date for daily aggregation
  
  // Enrollment Metrics
  totalEnrollments Int     @default(0)
  activeEnrollments Int    @default(0)
  completedEnrollments Int @default(0)
  cancellationRate Float   @default(0)
  
  // Financial Metrics
  totalRevenue    Float    @default(0) // ETB
  mosaRevenue     Float    @default(0) // ETB
  expertPayouts   Float    @default(0) // ETB
  averageRevenuePerUser Float @default(0)
  
  // Quality Metrics
  averageQualityScore Float @default(0)
  expertSatisfaction Float @default(0)
  studentSatisfaction Float @default(0)
  
  // Performance Metrics
  completionRate  Float    @default(0)
  successRate     Float    @default(0)
  timeToCompletion Float?  // Days
  
  // Skill Analytics
  popularSkills   Json     // Top skills by enrollment
  skillPerformance Json    // Performance by skill category
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([date])
}

model ExpertPerformance {
  id              String   @id @default(uuid())
  expertId        String
  periodStart     DateTime // Weekly/Monthly period
  periodEnd       DateTime
  
  // Performance Metrics
  totalStudents   Int      @default(0)
  completedStudents Int    @default(0)
  averageRating   Float    @default(0)
  qualityScore    Float    @default(0)
  completionRate  Float    @default(0)
  
  // Financial Metrics
  totalEarnings   Float    @default(0)
  bonusesEarned   Float    @default(0)
  averageEarningPerStudent Float @default(0)
  
  // Operational Metrics
  responseTime    Float?   // Hours
  attendanceRate  Float?   // 0-1
  studentRetention Float?  // 0-1
  
  // Relations
  expert          Expert   @relation(fields: [expertId], references: [id], onDelete: Cascade)
  
  // Timestamps
  createdAt       DateTime @default(now())
  
  @@unique([expertId, periodStart])
  @@index([periodStart, averageRating])
}

model StudentProgress {
  id              String   @id @default(uuid())
  studentId       String
  periodStart     DateTime
  periodEnd       DateTime
  
  // Progress Metrics
  activeEnrollments Int    @default(0)
  completedCourses Int     @default(0)
  averageProgress  Float   @default(0)
  successRate      Float   @default(0)
  
  // Learning Metrics
  totalTimeSpent  Int      @default(0) // Minutes
  averageScore    Float    @default(0)
  exerciseCompletionRate Float @default(0)
  
  // Financial Metrics
  totalSpent      Float    @default(0)
  coursesInProgress Int    @default(0)
  
  // Relations
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  // Timestamps
  createdAt       DateTime @default(now())
  
  @@unique([studentId, periodStart])
  @@index([periodStart, successRate])
}

🔐 Security & Audit
Audit & Compliance
prisma

// 🔐 SECURITY & AUDIT TRAIL

model AuditLog {
  id              String   @id @default(uuid())
  userId          String?
  userType        UserType
  action          String   @db.VarChar(100)
  resourceType    String   @db.VarChar(50)
  resourceId      String?
  
  // Change Details
  oldValues       Json?
  newValues       Json?
  ipAddress       String?  @db.VarChar(45)
  userAgent       String?
  
  // Metadata
  traceId         String?  @db.VarChar(100)
  severity        LogSeverity @default(INFO)
  
  // Timestamps
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([resourceType, resourceId])
  @@index([action, createdAt])
  @@index([severity, createdAt])
}

model SystemConfig {
  id              String   @id @default(uuid())
  key             String   @unique @db.VarChar(100)
  value           Json
  dataType        ConfigDataType
  description     String?  @db.VarChar(500)
  
  // Access Control
  isSensitive     Boolean  @default(false)
  accessLevel     AccessLevel @default(PUBLIC)
  
  // Versioning
  version         Int      @default(1)
  previousValue   Json?
  
  // Audit
  updatedBy       String?  // User ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([key, version])
}

// 🎯 ENUM DEFINITIONS

enum UserType {
  STUDENT
  EXPERT
  ADMIN
  SYSTEM
}

enum LogSeverity {
  DEBUG
  INFO
  WARN
  ERROR
  CRITICAL
}

enum ConfigDataType {
  STRING
  NUMBER
  BOOLEAN
  JSON
  ARRAY
}

enum AccessLevel {
  PUBLIC
  INTERNAL
  ADMIN
  SUPER_ADMIN
}

🚀 Performance Optimization
Database Indexes
sql

-- 🎯 ENTERPRISE PERFORMANCE INDEXES

-- User Performance
CREATE INDEX CONCURRENTLY idx_users_fayda_status ON users(fayda_id, status);
CREATE INDEX CONCURRENTLY idx_users_phone_status ON users(phone_number, status);
CREATE INDEX CONCURRENTLY idx_users_verification ON users(verification_level, created_at);

-- Enrollment Performance  
CREATE INDEX CONCURRENTLY idx_enrollments_student_status ON enrollments(student_id, status);
CREATE INDEX CONCURRENTLY idx_enrollments_expert_status ON enrollments(expert_id, status);
CREATE INDEX CONCURRENTLY idx_enrollments_skill_phase ON enrollments(skill_id, current_phase);
CREATE INDEX CONCURRENTLY idx_enrollments_created_date ON enrollments(created_at);

-- Payment Performance
CREATE INDEX CONCURRENTLY idx_payments_student_status ON payments(student_id, status);
CREATE INDEX CONCURRENTLY idx_payments_gateway_status ON payments(payment_gateway, status);
CREATE INDEX CONCURRENTLY idx_payments_created_date ON payments(created_at);

-- Quality Performance
CREATE INDEX CONCURRENTLY idx_quality_expert_score ON quality_metrics(expert_id, overall_score);
CREATE INDEX CONCURRENTLY idx_quality_score_valid ON quality_metrics(overall_score, is_valid);
CREATE INDEX CONCURRENTLY idx_quality_created_date ON quality_metrics(created_at);

-- Analytics Performance
CREATE INDEX CONCURRENTLY idx_analytics_date ON platform_analytics(date);
CREATE INDEX CONCURRENTLY idx_expert_performance_period ON expert_performance(period_start, average_rating);
CREATE INDEX CONCURRENTLY idx_student_progress_period ON student_progress(period_start, success_rate);

Query Optimization
sql

-- 🎯 ENTERPRISE QUERY OPTIMIZATION

-- Materialized Views for Analytics
CREATE MATERIALIZED VIEW mv_daily_enrollments AS
SELECT 
  DATE(created_at) as enrollment_date,
  skill_id,
  COUNT(*) as total_enrollments,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_enrollments,
  AVG(progress) as average_progress
FROM enrollments 
GROUP BY DATE(created_at), skill_id;

-- Refresh materialized views daily
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_daily_enrollments;
END;
$$ LANGUAGE plpgsql;

-- Partitioning for Large Tables
CREATE TABLE audit_logs_partitioned (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

📈 Migration Strategy
Production Migration Script
sql

-- 🚀 ENTERPRISE MIGRATION SCRIPT
-- migrations/001-enterprise-schema.sql

BEGIN;

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE account_type AS ENUM ('STUDENT', 'EXPERT', 'ADMIN', 'SUPER_ADMIN');

-- Create tables in dependency order
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fayda_id VARCHAR(20) UNIQUE NOT NULL,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  -- ... other columns as per schema
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create other tables...

-- Create indexes
CREATE INDEX CONCURRENTLY idx_users_fayda_status ON users(fayda_id, status);

-- Add foreign key constraints
ALTER TABLE students ADD CONSTRAINT fk_students_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;

Data Seeding
sql

-- 🌱 ENTERPRISE DATA SEEDING

-- Insert Skill Categories
INSERT INTO skill_categories (id, name, description, display_order) VALUES
  (uuid_generate_v4(), 'ONLINE_SKILLS', 'Digital and remote skills', 1),
  (uuid_generate_v4(), 'OFFLINE_SKILLS', 'Traditional hands-on skills', 2),
  (uuid_generate_v4(), 'HEALTH_SPORTS', 'Health, fitness and sports', 3),
  (uuid_generate_v4(), 'BEAUTY_FASHION', 'Beauty, fashion and personal care', 4);

-- Insert Default Bundle
INSERT INTO bundles (id, name, amount, mosa_revenue, expert_revenue) VALUES
  (uuid_generate_v4(), 'Standard 1999 Bundle', 1999, 1000, 999);

-- Insert System Configuration
INSERT INTO system_config (key, value, data_type, description) VALUES
  ('quality.threshold', '4.0', 'NUMBER', 'Minimum quality score for experts'),
  ('payout.schedule', '["START","MIDPOINT","COMPLETION"]', 'ARRAY', 'Expert payout phases'),
  ('revenue.split', '{"mosa":1000,"expert":999}', 'JSON', 'Platform revenue distribution');