-- 🎯 MOSA FORGE: Enterprise Expert Validation Migration
-- 
-- @filename: 002-expert-validation.sql
-- @description: Expert verification, portfolio validation, and quality tracking system
-- @version: 2.0.0
-- @author: Oumer Muktar | Powered by Chereka
-- 
-- 🏗️ ENTERPRISE FEATURES:
-- - Expert portfolio verification system
-- - Quality metrics and tier management
-- - Document validation and fraud prevention
-- - Performance tracking and capacity management

BEGIN;

-- 🏗️ Set transaction isolation level for data consistency
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 🏗️ Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 🎯 1. EXPERT VERIFICATION STATUS ENUM
CREATE TYPE expert_verification_status AS ENUM (
    'PENDING',
    'UNDER_REVIEW', 
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
    'REVOKED'
);

-- 🎯 2. EXPERT TIER ENUM (Quality-Based)
CREATE TYPE expert_tier AS ENUM (
    'MASTER',
    'SENIOR', 
    'STANDARD',
    'DEVELOPING',
    'PROBATION'
);

-- 🎯 3. DOCUMENT TYPE ENUM
CREATE TYPE document_type AS ENUM (
    'FAYDA_ID',
    'EDUCATION_CERTIFICATE',
    'PROFESSIONAL_CERTIFICATE',
    'PORTFOLIO_WORK',
    'BUSINESS_LICENSE',
    'TAX_REGISTRATION',
    'BANK_ACCOUNT',
    'OTHER'
);

-- 🎯 4. VERIFICATION METHOD ENUM
CREATE TYPE verification_method AS ENUM (
    'AUTOMATIC',
    'MANUAL_REVIEW',
    'THIRD_PARTY',
    'AI_VALIDATION'
);

-- 🎯 5. SKILL VERIFICATION STATUS ENUM
CREATE TYPE skill_verification_status AS ENUM (
    'NOT_VERIFIED',
    'PENDING_TEST',
    'TEST_PASSED',
    'PORTFOLIO_APPROVED',
    'FULLY_VERIFIED'
);

-- 🏗️ 6. EXPERT VERIFICATION TABLE
CREATE TABLE expert_verifications (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 Verification Status & Progress
    overall_status expert_verification_status NOT NULL DEFAULT 'PENDING',
    verification_score DECIMAL(3,2) CHECK (verification_score >= 0 AND verification_score <= 5),
    verification_method verification_method NOT NULL DEFAULT 'MANUAL_REVIEW',
    
    -- 🎯 Government ID Verification (Fayda)
    fayda_id VARCHAR(50) UNIQUE,
    fayda_verified_at TIMESTAMP WITH TIME ZONE,
    fayda_verification_id VARCHAR(100),
    fayda_confidence_score DECIMAL(3,2) CHECK (fayda_confidence_score >= 0 AND fayda_confidence_score <= 1),
    
    -- 🎯 Quality & Tier Management
    current_tier expert_tier NOT NULL DEFAULT 'PROBATION',
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 5),
    max_students INTEGER NOT NULL DEFAULT 10 CHECK (max_students >= 0 AND max_students <= 1000),
    current_students INTEGER NOT NULL DEFAULT 0 CHECK (current_students >= 0),
    
    -- 🎯 Performance Metrics
    completion_rate DECIMAL(4,3) CHECK (completion_rate >= 0 AND completion_rate <= 1),
    average_rating DECIMAL(3,2) CHECK (average_rating >= 0 AND average_rating <= 5),
    response_time_hours INTEGER CHECK (response_time_hours >= 0 AND response_time_hours <= 168), -- 1 week max
    
    -- 🎯 Capacity & Availability
    is_accepting_students BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_capacity INTEGER NOT NULL DEFAULT 5 CHECK (weekly_capacity >= 0 AND weekly_capacity <= 50),
    student_satisfaction_score DECIMAL(3,2) CHECK (student_satisfaction_score >= 0 AND student_satisfaction_score <= 5),
    
    -- 🎯 Financial Tracking
    total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0.0 CHECK (total_earnings >= 0),
    pending_payouts DECIMAL(10,2) NOT NULL DEFAULT 0.0 CHECK (pending_payouts >= 0),
    quality_bonus_earned DECIMAL(10,2) NOT NULL DEFAULT 0.0 CHECK (quality_bonus_earned >= 0),
    
    -- 🎯 Audit & Security
    verified_by UUID REFERENCES users(id),
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    last_quality_review_at TIMESTAMP WITH TIME ZONE,
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_verification_progress CHECK (
        (overall_status = 'APPROVED' AND verification_score >= 4.0) OR 
        overall_status != 'APPROVED'
    ),
    CONSTRAINT valid_student_capacity CHECK (current_students <= max_students),
    CONSTRAINT valid_tier_thresholds CHECK (
        (current_tier = 'MASTER' AND quality_score >= 4.7) OR
        (current_tier = 'SENIOR' AND quality_score >= 4.3) OR
        (current_tier = 'STANDARD' AND quality_score >= 4.0) OR
        (current_tier = 'DEVELOPING' AND quality_score >= 3.5) OR
        (current_tier = 'PROBATION' AND quality_score < 4.0)
    )
);

-- 🏗️ 7. EXPERT DOCUMENTS TABLE
CREATE TABLE expert_documents (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 Document Information
    document_type document_type NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    
    -- 🎯 File Storage & Verification
    file_url VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) UNIQUE, -- SHA-256 for duplicate detection
    file_size INTEGER CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    mime_type VARCHAR(100) NOT NULL,
    
    -- 🎯 Verification Status
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- 🎯 AI & Fraud Detection
    ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
    is_authentic BOOLEAN,
    fraud_risk_level VARCHAR(20) CHECK (fraud_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    duplicate_document_ids UUID[], -- References to potential duplicates
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date > issue_date),
    CONSTRAINT verified_requirements CHECK (
        (is_verified = TRUE AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR
        is_verified = FALSE
    )
);

-- 🏗️ 8. EXPERT SKILLS VERIFICATION TABLE
CREATE TABLE expert_skills_verification (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    
    -- 🎯 Verification Status
    verification_status skill_verification_status NOT NULL DEFAULT 'NOT_VERIFIED',
    verification_score DECIMAL(3,2) CHECK (verification_score >= 0 AND verification_score <= 5),
    
    -- 🎯 Skill Testing
    skill_test_score DECIMAL(5,2) CHECK (skill_test_score >= 0 AND skill_test_score <= 100),
    test_completed_at TIMESTAMP WITH TIME ZONE,
    test_duration_minutes INTEGER CHECK (test_duration_minutes >= 0),
    
    -- 🎯 Portfolio Assessment
    portfolio_work_samples JSONB, -- Array of portfolio items
    portfolio_rating DECIMAL(3,2) CHECK (portfolio_rating >= 0 AND portfolio_rating <= 5),
    portfolio_reviewed_by UUID REFERENCES users(id),
    portfolio_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- 🎯 Experience & Specialization
    years_of_experience INTEGER CHECK (years_of_experience >= 0 AND years_of_experience <= 50),
    specialization_area VARCHAR(100),
    tools_technologies TEXT[], -- Array of tools/technologies used
    
    -- 🎯 Performance Metrics (Skill-specific)
    skill_completion_rate DECIMAL(4,3) CHECK (skill_completion_rate >= 0 AND skill_completion_rate <= 1),
    skill_average_rating DECIMAL(3,2) CHECK (skill_average_rating >= 0 AND skill_average_rating <= 5),
    students_trained INTEGER NOT NULL DEFAULT 0 CHECK (students_trained >= 0),
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    UNIQUE(expert_id, skill_id),
    CONSTRAINT valid_verification_progression CHECK (
        (verification_status = 'FULLY_VERIFIED' AND verification_score >= 4.0) OR
        verification_status != 'FULLY_VERIFIED'
    ),
    CONSTRAINT valid_portfolio_review CHECK (
        (portfolio_rating IS NOT NULL AND portfolio_reviewed_by IS NOT NULL AND portfolio_reviewed_at IS NOT NULL) OR
        portfolio_rating IS NULL
    )
);

-- 🏗️ 9. QUALITY METRICS TABLE
CREATE TABLE quality_metrics (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 Core Quality Metrics
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 5),
    completion_rate DECIMAL(4,3) NOT NULL CHECK (completion_rate >= 0 AND completion_rate <= 1),
    average_rating DECIMAL(3,2) NOT NULL CHECK (average_rating >= 0 AND average_rating <= 5),
    response_time_hours INTEGER NOT NULL CHECK (response_time_hours >= 0 AND response_time_hours <= 168),
    
    -- 🎯 Detailed Performance Metrics
    student_satisfaction DECIMAL(3,2) CHECK (student_satisfaction >= 0 AND student_satisfaction <= 5),
    progress_consistency DECIMAL(4,3) CHECK (progress_consistency >= 0 AND progress_consistency <= 1),
    assignment_quality DECIMAL(3,2) CHECK (assignment_quality >= 0 AND assignment_quality <= 5),
    communication_quality DECIMAL(3,2) CHECK (communication_quality >= 0 AND communication_quality <= 5),
    
    -- 🎯 Volume & Capacity Metrics
    total_students_served INTEGER NOT NULL DEFAULT 0 CHECK (total_students_served >= 0),
    active_students INTEGER NOT NULL DEFAULT 0 CHECK (active_students >= 0),
    completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0),
    
    -- 🎯 Financial Performance
    revenue_generated DECIMAL(10,2) NOT NULL DEFAULT 0.0 CHECK (revenue_generated >= 0),
    quality_bonus_earned DECIMAL(10,2) NOT NULL DEFAULT 0.0 CHECK (quality_bonus_earned >= 0),
    refund_rate DECIMAL(4,3) CHECK (refund_rate >= 0 AND refund_rate <= 1),
    
    -- 🎯 Timestamps
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_period CHECK (period_end > period_start),
    CONSTRAINT unique_metric_period UNIQUE (expert_id, period_start, period_end)
);

-- 🏗️ 10. EXPERT TIER HISTORY TABLE
CREATE TABLE expert_tier_history (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 Tier Information
    previous_tier expert_tier,
    new_tier expert_tier NOT NULL,
    effective_date DATE NOT NULL,
    
    -- 🎯 Change Reason & Metrics
    change_reason TEXT NOT NULL,
    quality_score_at_change DECIMAL(3,2) CHECK (quality_score_at_change >= 0 AND quality_score_at_change <= 5),
    completion_rate_at_change DECIMAL(4,3) CHECK (completion_rate_at_change >= 0 AND completion_rate_at_change <= 1),
    
    -- 🎯 Administrative
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_tier_transition CHECK (previous_tier != new_tier)
);

-- 🏗️ 11. VERIFICATION AUDIT LOG TABLE
CREATE TABLE verification_audit_log (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🎯 Audit Information
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'VERIFICATION_STARTED',
        'DOCUMENT_UPLOADED',
        'DOCUMENT_VERIFIED',
        'SKILL_TEST_STARTED',
        'SKILL_TEST_COMPLETED',
        'PORTFOLIO_REVIEWED',
        'TIER_PROMOTION',
        'TIER_DEMOTION',
        'VERIFICATION_APPROVED',
        'VERIFICATION_REJECTED',
        'SUSPENSION',
        'REINSTATEMENT'
    )),
    
    -- 🎯 Action Details
    old_values JSONB,
    new_values JSONB,
    action_metadata JSONB,
    
    -- 🎯 Performer Information
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 IP & Security
    ip_address INET,
    user_agent TEXT,
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🏗️ 12. EXPERT CAPACITY SCHEDULE TABLE
CREATE TABLE expert_capacity_schedule (
    -- 🎯 Primary Identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 Schedule Information
    schedule_date DATE NOT NULL,
    time_slot_start TIME NOT NULL,
    time_slot_end TIME NOT NULL,
    
    -- 🎯 Capacity Management
    max_students_per_slot INTEGER NOT NULL DEFAULT 5 CHECK (max_students_per_slot >= 1 AND max_students_per_slot <= 10),
    booked_students INTEGER NOT NULL DEFAULT 0 CHECK (booked_students >= 0 AND booked_students <= max_students_per_slot),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 🎯 Recurring Schedule
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    recurrence_end_date DATE,
    
    -- 🎯 Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_time_slot CHECK (time_slot_end > time_slot_start),
    UNIQUE(expert_id, schedule_date, time_slot_start, time_slot_end)
);

-- 🎯 ENTERPRISE INDEXES FOR PERFORMANCE

-- Expert Verifications Indexes
CREATE INDEX idx_expert_verifications_status ON expert_verifications(overall_status);
CREATE INDEX idx_expert_verifications_tier ON expert_verifications(current_tier);
CREATE INDEX idx_expert_verifications_quality ON expert_verifications(quality_score);
CREATE INDEX idx_expert_verifications_fayda ON expert_verifications(fayda_id);
CREATE INDEX idx_expert_verifications_accepting ON expert_verifications(is_accepting_students) WHERE is_accepting_students = TRUE;

-- Expert Documents Indexes
CREATE INDEX idx_expert_documents_type ON expert_documents(document_type);
CREATE INDEX idx_expert_documents_verified ON expert_documents(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_expert_documents_hash ON expert_documents(file_hash);
CREATE INDEX idx_expert_documents_expiry ON expert_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Skills Verification Indexes
CREATE INDEX idx_skills_verification_status ON expert_skills_verification(verification_status);
CREATE INDEX idx_skills_verification_score ON expert_skills_verification(verification_score);
CREATE INDEX idx_skills_verification_expert_skill ON expert_skills_verification(expert_id, skill_id);

-- Quality Metrics Indexes
CREATE INDEX idx_quality_metrics_score ON quality_metrics(overall_score);
CREATE INDEX idx_quality_metrics_period ON quality_metrics(period_start, period_end);
CREATE INDEX idx_quality_metrics_expert_period ON quality_metrics(expert_id, period_start);

-- Tier History Indexes
CREATE INDEX idx_tier_history_dates ON expert_tier_history(effective_date);
CREATE INDEX idx_tier_history_expert ON expert_tier_history(expert_id, effective_date);

-- Audit Log Indexes
CREATE INDEX idx_audit_log_action ON verification_audit_log(action_type);
CREATE INDEX idx_audit_log_dates ON verification_audit_log(performed_at);
CREATE INDEX idx_audit_log_expert ON verification_audit_log(expert_id, performed_at);

-- Capacity Schedule Indexes
CREATE INDEX idx_capacity_schedule_dates ON expert_capacity_schedule(schedule_date);
CREATE INDEX idx_capacity_schedule_available ON expert_capacity_schedule(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_capacity_schedule_expert_date ON expert_capacity_schedule(expert_id, schedule_date);

-- 🎯 ENTERPRISE FOREIGN KEY CONSTRAINTS

-- Add foreign key from users to expert_verifications (if users table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE expert_verifications 
        ADD CONSTRAINT fk_expert_verifications_user 
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 🎯 ENTERPRISE FUNCTIONS AND TRIGGERS

-- 🏗️ Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🏗️ Apply updated_at triggers to all tables
CREATE TRIGGER update_expert_verifications_updated_at 
    BEFORE UPDATE ON expert_verifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_documents_updated_at 
    BEFORE UPDATE ON expert_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_skills_updated_at 
    BEFORE UPDATE ON expert_skills_verification 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capacity_schedule_updated_at 
    BEFORE UPDATE ON expert_capacity_schedule 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🏗️ Function to calculate expert quality score
CREATE OR REPLACE FUNCTION calculate_expert_quality_score(
    p_completion_rate DECIMAL,
    p_average_rating DECIMAL,
    p_response_time INTEGER,
    p_student_satisfaction DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    base_score DECIMAL;
    completion_weight DECIMAL := 0.35;
    rating_weight DECIMAL := 0.30;
    response_weight DECIMAL := 0.20;
    satisfaction_weight DECIMAL := 0.15;
BEGIN
    -- Normalize completion rate (0-1 to 0-5 scale)
    base_score := (p_completion_rate * 5) * completion_weight;
    
    -- Add rating contribution
    base_score := base_score + (p_average_rating * rating_weight);
    
    -- Add response time contribution (faster response = higher score)
    base_score := base_score + (
        (GREATEST(0, (24 - p_response_time)) / 24 * 5) * response_weight
    );
    
    -- Add satisfaction contribution
    base_score := base_score + (p_student_satisfaction * satisfaction_weight);
    
    -- Ensure score is within bounds
    RETURN GREATEST(0, LEAST(5, base_score));
END;
$$ LANGUAGE plpgsql;

-- 🏗️ Function to auto-update expert tier based on quality score
CREATE OR REPLACE FUNCTION update_expert_tier()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tier based on quality score
    IF NEW.quality_score >= 4.7 AND NEW.completion_rate >= 0.8 THEN
        NEW.current_tier := 'MASTER';
        NEW.max_students := 1000; -- Unlimited with quality
    ELSIF NEW.quality_score >= 4.3 AND NEW.completion_rate >= 0.75 THEN
        NEW.current_tier := 'SENIOR';
        NEW.max_students := 100;
    ELSIF NEW.quality_score >= 4.0 AND NEW.completion_rate >= 0.7 THEN
        NEW.current_tier := 'STANDARD';
        NEW.max_students := 50;
    ELSIF NEW.quality_score >= 3.5 THEN
        NEW.current_tier := 'DEVELOPING';
        NEW.max_students := 25;
    ELSE
        NEW.current_tier := 'PROBATION';
        NEW.max_students := 10;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🏗️ Trigger to auto-update tier when quality metrics change
CREATE TRIGGER trigger_update_expert_tier
    BEFORE UPDATE OF quality_score, completion_rate ON expert_verifications
    FOR EACH ROW
    WHEN (OLD.quality_score IS DISTINCT FROM NEW.quality_score OR OLD.completion_rate IS DISTINCT FROM NEW.completion_rate)
    EXECUTE FUNCTION update_expert_tier();

-- 🏗️ Function to log tier changes
CREATE OR REPLACE FUNCTION log_tier_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_tier IS DISTINCT FROM NEW.current_tier THEN
        INSERT INTO expert_tier_history (
            expert_id,
            previous_tier,
            new_tier,
            effective_date,
            change_reason,
            quality_score_at_change,
            completion_rate_at_change
        ) VALUES (
            NEW.expert_id,
            OLD.current_tier,
            NEW.current_tier,
            NOW(),
            'AUTOMATIC_QUALITY_UPDATE',
            NEW.quality_score,
            NEW.completion_rate
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🏗️ Trigger to log tier changes
CREATE TRIGGER trigger_log_tier_change
    AFTER UPDATE OF current_tier ON expert_verifications
    FOR EACH ROW
    WHEN (OLD.current_tier IS DISTINCT FROM NEW.current_tier)
    EXECUTE FUNCTION log_tier_change();

-- 🎯 ENTERPRISE VIEWS FOR REPORTING

-- 🏗️ View for expert verification dashboard
CREATE OR REPLACE VIEW expert_verification_dashboard AS
SELECT 
    ev.id,
    ev.expert_id,
    u.email,
    u.full_name,
    ev.overall_status,
    ev.current_tier,
    ev.quality_score,
    ev.completion_rate,
    ev.average_rating,
    ev.response_time_hours,
    ev.current_students,
    ev.max_students,
    ev.is_accepting_students,
    COUNT(ed.id) as total_documents,
    COUNT(ed.id) FILTER (WHERE ed.is_verified = TRUE) as verified_documents,
    COUNT(esv.id) as total_skills,
    COUNT(esv.id) FILTER (WHERE esv.verification_status = 'FULLY_VERIFIED') as verified_skills,
    ev.created_at,
    ev.updated_at
FROM expert_verifications ev
JOIN users u ON ev.expert_id = u.id
LEFT JOIN expert_documents ed ON ev.expert_id = ed.expert_id
LEFT JOIN expert_skills_verification esv ON ev.expert_id = esv.expert_id
GROUP BY 
    ev.id, ev.expert_id, u.email, u.full_name, ev.overall_status, 
    ev.current_tier, ev.quality_score, ev.completion_rate, 
    ev.average_rating, ev.response_time_hours, ev.current_students,
    ev.max_students, ev.is_accepting_students, ev.created_at, ev.updated_at;

-- 🏗️ View for quality monitoring
CREATE OR REPLACE VIEW expert_quality_monitoring AS
SELECT
    ev.expert_id,
    u.full_name,
    ev.current_tier,
    ev.quality_score,
    ev.completion_rate,
    ev.average_rating,
    ev.response_time_hours,
    ev.student_satisfaction_score,
    ev.current_students,
    ev.max_students,
    CASE 
        WHEN ev.quality_score >= 4.7 THEN 'EXCELLENT'
        WHEN ev.quality_score >= 4.3 THEN 'GOOD'
        WHEN ev.quality_score >= 4.0 THEN 'SATISFACTORY'
        WHEN ev.quality_score >= 3.5 THEN 'NEEDS_IMPROVEMENT'
        ELSE 'CRITICAL'
    END as quality_band,
    ev.last_quality_review_at,
    ev.updated_at
FROM expert_verifications ev
JOIN users u ON ev.expert_id = u.id
WHERE ev.overall_status = 'APPROVED';

-- 🎯 ENTERPRISE DATA SEEDING FOR TESTING

-- 🏗️ Insert sample verification statuses (optional - for testing)
INSERT INTO expert_verifications (expert_id, overall_status, current_tier, quality_score, max_students)
SELECT 
    id,
    'APPROVED',
    'STANDARD',
    4.2,
    50
FROM users 
WHERE user_type = 'EXPERT'
LIMIT 1;

-- 🎯 GRANT PERMISSIONS FOR MICROSERVICE ARCHITECTURE

-- Grant permissions to application user (replace with actual username)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mosa_app') THEN
        GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO mosa_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mosa_app;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mosa_app;
    END IF;
END $$;

-- 🎯 UPDATE MIGRATION METADATA

-- Insert migration record
INSERT INTO migrations (name, batch, created_at) 
VALUES ('002-expert-validation', 1, NOW());

COMMIT;

-- 🎯 POST-MIGRATION VALIDATION QUERY

DO $$
BEGIN
    -- Verify all tables were created
    ASSERT (SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN (
                'expert_verifications',
                'expert_documents', 
                'expert_skills_verification',
                'quality_metrics',
                'expert_tier_history',
                'verification_audit_log',
                'expert_capacity_schedule'
            )) = 7, 'Not all expert validation tables were created';
    
    -- Verify indexes were created
    ASSERT (SELECT COUNT(*) FROM pg_indexes 
            WHERE tablename LIKE 'expert_%' 
            AND indexname LIKE 'idx_%') >= 15, 'Not all indexes were created';
    
    RAISE NOTICE '🎯 Expert validation migration completed successfully';
END $$;