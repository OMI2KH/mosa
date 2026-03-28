/**
 * 🎯 MOSA FORGE: Enterprise Training Sessions Migration
 * 
 * @file 004-training-sessions.sql
 * @description Comprehensive training management system with quality tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Training session lifecycle management
 * - Quality guarantee enforcement
 * - Attendance verification system
 * - Expert-student matching optimization
 * - Performance analytics and reporting
 * - Hands-on workspace management
 */

-- 🏗️ Enable UUID extension for enterprise identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🎯 ENTERPRISE TRAINING SESSIONS TABLE
CREATE TABLE training_sessions (
    -- 🆔 Enterprise Primary Key with UUID for distributed systems
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔗 Enterprise Relationships with Foreign Keys
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE RESTRICT,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    
    -- 🎯 Session Core Information
    session_number INTEGER NOT NULL CHECK (session_number > 0),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 🏗️ Session Configuration
    session_type training_session_type NOT NULL DEFAULT 'PRACTICAL',
    difficulty_level difficulty_level NOT NULL DEFAULT 'BEGINNER',
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 30 AND 480), -- 30min to 8hrs
    max_participants INTEGER NOT NULL DEFAULT 5 CHECK (max_participants BETWEEN 1 AND 10),
    
    -- 📅 Enterprise Scheduling System
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    -- 🏗️ Session Status Management
    status training_session_status NOT NULL DEFAULT 'SCHEDULED',
    cancellation_reason cancellation_reason_type,
    cancellation_notes TEXT,
    
    -- 📍 Location & Delivery Management
    delivery_mode delivery_mode_type NOT NULL DEFAULT 'VIRTUAL',
    location_details JSONB, -- For physical sessions: address, coordinates, etc.
    virtual_meeting_url VARCHAR(500),
    virtual_meeting_id VARCHAR(100),
    
    -- 🛡️ Quality & Attendance Tracking
    attendance_verified_at TIMESTAMPTZ,
    attendance_verification_method attendance_method_type,
    expert_joined_at TIMESTAMPTZ,
    expert_left_at TIMESTAMPTZ,
    
    -- 📊 Performance Metrics
    student_satisfaction_rating DECIMAL(3,2) CHECK (
        student_satisfaction_rating IS NULL OR 
        (student_satisfaction_rating >= 1 AND student_satisfaction_rating <= 5)
    ),
    expert_performance_rating DECIMAL(3,2) CHECK (
        expert_performance_rating IS NULL OR 
        (expert_performance_rating >= 1 AND expert_performance_rating <= 5)
    ),
    completion_percentage DECIMAL(5,2) CHECK (
        completion_percentage IS NULL OR 
        (completion_percentage >= 0 AND completion_percentage <= 100)
    ),
    
    -- 🏗️ Enterprise Metadata
    metadata JSONB DEFAULT '{}'::JSONB, -- Flexible field for future extensions
    trace_id VARCHAR(100), -- Distributed tracing ID
    
    -- ⏰ Enterprise Timestamps with Timezone
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- 🎯 Enterprise Constraints
    CONSTRAINT valid_session_duration CHECK (scheduled_end > scheduled_start),
    CONSTRAINT valid_actual_times CHECK (
        (actual_start IS NULL AND actual_end IS NULL) OR 
        (actual_start IS NOT NULL AND actual_end IS NOT NULL AND actual_end >= actual_start)
    ),
    CONSTRAINT chk_virtual_session_url CHECK (
        delivery_mode != 'VIRTUAL' OR virtual_meeting_url IS NOT NULL
    )
);

-- 🎯 ENTERPRISE SESSION PARTICIPANTS TABLE
CREATE TABLE training_session_participants (
    -- 🆔 Composite Primary Key for performance
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- 🏗️ Participant Status & Attendance
    status participant_status_type NOT NULL DEFAULT 'INVITED',
    invitation_sent_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,
    
    -- 📊 Attendance Tracking
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    attendance_status attendance_status_type DEFAULT 'ABSENT',
    attendance_verified_by UUID REFERENCES experts(id),
    attendance_verified_at TIMESTAMPTZ,
    
    -- 📈 Performance & Engagement
    participation_score DECIMAL(5,2) CHECK (
        participation_score IS NULL OR 
        (participation_score >= 0 AND participation_score <= 100)
    ),
    engagement_metrics JSONB DEFAULT '{}'::JSONB, -- Questions asked, exercises completed, etc.
    
    -- 🏗️ Quality Feedback
    student_feedback_submitted_at TIMESTAMPTZ,
    student_rating DECIMAL(3,2) CHECK (
        student_rating IS NULL OR 
        (student_rating >= 1 AND student_rating <= 5)
    ),
    student_feedback TEXT,
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 🎯 Enterprise Constraints
    UNIQUE(session_id, student_id), -- Prevent duplicate participants
    CONSTRAINT valid_participation_times CHECK (
        (joined_at IS NULL AND left_at IS NULL) OR 
        (joined_at IS NOT NULL AND left_at IS NOT NULL AND left_at >= joined_at)
    )
);

-- 🎯 ENTERPRISE SESSION MATERIALS & RESOURCES TABLE
CREATE TABLE training_session_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    
    -- 🏗️ Material Information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type material_type NOT NULL DEFAULT 'EXERCISE',
    file_url VARCHAR(500), -- S3 or CDN URL
    file_size BIGINT CHECK (file_size > 0),
    file_type VARCHAR(100),
    
    -- 🎯 Exercise Specific Fields
    exercise_type exercise_type,
    difficulty_level difficulty_level DEFAULT 'BEGINNER',
    estimated_completion_minutes INTEGER CHECK (estimated_completion_minutes > 0),
    learning_objectives JSONB, -- Array of learning objectives
    
    -- 🏗️ Access Control
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    
    -- 📊 Usage Analytics
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- 🎯 Enterprise Constraints
    CONSTRAINT chk_material_availability CHECK (
        (available_from IS NULL AND available_until IS NULL) OR 
        (available_from IS NOT NULL AND available_until IS NOT NULL AND available_until > available_from)
    )
);

-- 🎯 ENTERPRISE SESSION EXERCISE SUBMISSIONS TABLE
CREATE TABLE exercise_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES training_session_materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- 🏗️ Submission Content
    submission_content JSONB, -- Flexible field for various exercise types
    file_urls JSONB, -- Array of file URLs for file submissions
    submission_notes TEXT,
    
    -- 🎯 Grading & Evaluation
    status submission_status_type NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES experts(id),
    reviewed_at TIMESTAMPTZ,
    
    -- 📊 Evaluation Metrics
    score DECIMAL(5,2) CHECK (
        score IS NULL OR 
        (score >= 0 AND score <= 100)
    ),
    grade grade_type,
    feedback_from_expert TEXT,
    improvement_suggestions JSONB,
    
    -- 🏗️ Resubmission Management
    resubmission_requested BOOLEAN DEFAULT FALSE,
    resubmission_request_notes TEXT,
    resubmission_deadline TIMESTAMPTZ,
    resubmission_count INTEGER DEFAULT 0 CHECK (resubmission_count >= 0),
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 🎯 Enterprise Constraints
    UNIQUE(session_id, material_id, student_id), -- One submission per exercise per student
    CONSTRAINT valid_review_timing CHECK (reviewed_at >= submitted_at)
);

-- 🎯 ENTERPRISE SESSION QUALITY METRICS TABLE
CREATE TABLE session_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    
    -- 📊 Quality Score Components (1-5 scale)
    preparation_score DECIMAL(3,2) CHECK (preparation_score >= 1 AND preparation_score <= 5),
    communication_score DECIMAL(3,2) CHECK (communication_score >= 1 AND communication_score <= 5),
    expertise_score DECIMAL(3,2) CHECK (expertise_score >= 1 AND expertise_score <= 5),
    engagement_score DECIMAL(3,2) CHECK (engagement_score >= 1 AND engagement_score <= 5),
    effectiveness_score DECIMAL(3,2) CHECK (effectiveness_score >= 1 AND effectiveness_score <= 5),
    
    -- 🎯 Calculated Metrics
    overall_quality_score DECIMAL(3,2) GENERATED ALWAYS AS (
        (preparation_score + communication_score + expertise_score + engagement_score + effectiveness_score) / 5
    ) STORED,
    
    -- 📈 Participant Feedback Aggregation
    average_student_rating DECIMAL(3,2) CHECK (
        average_student_rating >= 1 AND average_student_rating <= 5
    ),
    feedback_count INTEGER DEFAULT 0 CHECK (feedback_count >= 0),
    
    -- 🏗️ Quality Threshold Compliance
    meets_quality_standards BOOLEAN GENERATED ALWAYS AS (
        overall_quality_score >= 4.0 AND average_student_rating >= 4.0
    ) STORED,
    
    -- 📝 Quality Notes & Actions
    quality_notes TEXT,
    improvement_actions JSONB, -- Structured improvement plan
    quality_reviewed_by UUID REFERENCES experts(id), -- Senior expert review
    quality_reviewed_at TIMESTAMPTZ,
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 🎯 Enterprise Constraints
    UNIQUE(session_id) -- One quality record per session
);

-- 🎯 ENTERPRISE SESSION WORKSPACES TABLE (Hands-on Practical Training)
CREATE TABLE practical_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- 🏗️ Workspace Configuration
    workspace_type workspace_type NOT NULL DEFAULT 'VIRTUAL_LAB',
    workspace_url VARCHAR(500), -- URL to access the workspace
    workspace_credentials JSONB, -- Secure credential storage
    configuration JSONB, -- Workspace-specific configuration
    
    -- 🎯 Workspace Status
    status workspace_status_type NOT NULL DEFAULT 'PROVISIONING',
    provisioned_at TIMESTAMPTZ,
    accessed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    
    -- 📊 Usage Analytics
    total_usage_minutes INTEGER DEFAULT 0 CHECK (total_usage_minutes >= 0),
    session_count INTEGER DEFAULT 0 CHECK (session_count >= 0),
    
    -- 💾 Resource Management
    storage_used_mb DECIMAL(10,2) DEFAULT 0 CHECK (storage_used_mb >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 🏗️ Expiration & Cleanup
    expires_at TIMESTAMPTZ,
    cleanup_scheduled_at TIMESTAMPTZ,
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 🎯 Enterprise Constraints
    UNIQUE(session_id, student_id), -- One workspace per student per session
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- 🎯 ENTERPRISE SESSION ATTENDANCE VERIFICATION LOGS
CREATE TABLE attendance_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES training_session_participants(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    
    -- 🏗️ Verification Methods
    verification_method attendance_method_type NOT NULL,
    verification_data JSONB, -- Biometric data, GPS coordinates, etc.
    
    -- 📍 Location Data (for physical sessions)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_accuracy DECIMAL(5,2), -- Accuracy in meters
    
    -- 🔒 Security & Validation
    device_fingerprint VARCHAR(255), -- Device identification
    ip_address INET,
    user_agent TEXT,
    
    -- 🎯 Verification Result
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_confidence DECIMAL(5,2) CHECK (
        verification_confidence >= 0 AND verification_confidence <= 100
    ),
    verification_notes TEXT,
    
    -- ⏰ Enterprise Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 🎯 Enterprise Indexes (implicitly created by foreign keys)
    CONSTRAINT fk_session_attendance FOREIGN KEY (session_id) REFERENCES training_sessions(id),
    CONSTRAINT fk_participant_attendance FOREIGN KEY (participant_id) REFERENCES training_session_participants(id)
);

-- 🎯 ENTERPRISE CUSTOM TYPES FOR TYPE SAFETY
DO $$ BEGIN
    -- Training Session Types
    CREATE TYPE training_session_type AS ENUM (
        'THEORY',
        'PRACTICAL',
        'ASSESSMENT',
        'REVIEW',
        'Q&A',
        'WORKSHOP'
    );

    -- Session Status Types
    CREATE TYPE training_session_status AS ENUM (
        'SCHEDULED',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
    );

    -- Delivery Mode Types
    CREATE TYPE delivery_mode_type AS ENUM (
        'VIRTUAL',
        'IN_PERSON',
        'HYBRID'
    );

    -- Participant Status Types
    CREATE TYPE participant_status_type AS ENUM (
        'INVITED',
        'CONFIRMED',
        'ATTENDED',
        'CANCELLED',
        'NO_SHOW'
    );

    -- Attendance Status Types
    CREATE TYPE attendance_status_type AS ENUM (
        'PRESENT',
        'LATE',
        'ABSENT',
        'EXCUSED'
    );

    -- Attendance Method Types
    CREATE TYPE attendance_method_type AS ENUM (
        'MANUAL',
        'BIOMETRIC',
        'LOCATION',
        'QR_CODE',
        'AUTOMATIC'
    );

    -- Material Types
    CREATE TYPE material_type AS ENUM (
        'EXERCISE',
        'DOCUMENT',
        'VIDEO',
        'PRESENTATION',
        'TEMPLATE',
        'REFERENCE'
    );

    -- Exercise Types
    CREATE TYPE exercise_type AS ENUM (
        'CODING',
        'DESIGN',
        'ANALYSIS',
        'PRESENTATION',
        'QUIZ',
        'PROJECT'
    );

    -- Submission Status Types
    CREATE TYPE submission_status_type AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'NEEDS_IMPROVEMENT',
        'REJECTED'
    );

    -- Grade Types
    CREATE TYPE grade_type AS ENUM (
        'A_PLUS',
        'A',
        'A_MINUS',
        'B_PLUS',
        'B',
        'B_MINUS',
        'C_PLUS',
        'C',
        'C_MINUS',
        'F'
    );

    -- Workspace Types
    CREATE TYPE workspace_type AS ENUM (
        'VIRTUAL_LAB',
        'CLOUD_IDE',
        'DESIGN_STUDIO',
        'TRADING_SIMULATOR',
        'PROJECT_SPACE'
    );

    -- Workspace Status Types
    CREATE TYPE workspace_status_type AS ENUM (
        'PROVISIONING',
        'ACTIVE',
        'SUSPENDED',
        'TERMINATED',
        'EXPIRED'
    );

    -- Difficulty Levels
    CREATE TYPE difficulty_level AS ENUM (
        'BEGINNER',
        'INTERMEDIATE',
        'ADVANCED',
        'EXPERT'
    );

    -- Cancellation Reason Types
    CREATE TYPE cancellation_reason_type AS ENUM (
        'EXPERT_UNAVAILABLE',
        'STUDENT_REQUEST',
        'TECHNICAL_ISSUE',
        'WEATHER',
        'EMERGENCY',
        'LOW_ATTENDANCE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 🎯 ENTERPRISE INDEXES FOR PERFORMANCE
CREATE INDEX CONCURRENTLY idx_training_sessions_enrollment_id ON training_sessions(enrollment_id);
CREATE INDEX CONCURRENTLY idx_training_sessions_expert_id ON training_sessions(expert_id);
CREATE INDEX CONCURRENTLY idx_training_sessions_skill_id ON training_sessions(skill_id);
CREATE INDEX CONCURRENTLY idx_training_sessions_status ON training_sessions(status);
CREATE INDEX CONCURRENTLY idx_training_sessions_scheduled_start ON training_sessions(scheduled_start);
CREATE INDEX CONCURRENTLY idx_training_sessions_scheduled_range ON training_sessions(scheduled_start, scheduled_end);

CREATE INDEX CONCURRENTLY idx_participants_session_id ON training_session_participants(session_id);
CREATE INDEX CONCURRENTLY idx_participants_student_id ON training_session_participants(student_id);
CREATE INDEX CONCURRENTLY idx_participants_status ON training_session_participants(status);
CREATE INDEX CONCURRENTLY idx_participants_attendance ON training_session_participants(attendance_status);

CREATE INDEX CONCURRENTLY idx_materials_session_id ON training_session_materials(session_id);
CREATE INDEX CONCURRENTLY idx_materials_type ON training_session_materials(material_type);
CREATE INDEX CONCURRENTLY idx_materials_availability ON training_session_materials(available_from, available_until);

CREATE INDEX CONCURRENTLY idx_submissions_session_student ON exercise_submissions(session_id, student_id);
CREATE INDEX CONCURRENTLY idx_submissions_status ON exercise_submissions(status);
CREATE INDEX CONCURRENTLY idx_submissions_reviewed ON exercise_submissions(reviewed_at);

CREATE INDEX CONCURRENTLY idx_quality_sessions ON session_quality_metrics(session_id);
CREATE INDEX CONCURRENTLY idx_quality_experts ON session_quality_metrics(expert_id);
CREATE INDEX CONCURRENTLY idx_quality_standards ON session_quality_metrics(meets_quality_standards);

CREATE INDEX CONCURRENTLY idx_workspaces_session_student ON practical_workspaces(session_id, student_id);
CREATE INDEX CONCURRENTLY idx_workspaces_status ON practical_workspaces(status);
CREATE INDEX CONCURRENTLY idx_workspaces_expiration ON practical_workspaces(expires_at);

CREATE INDEX CONCURRENTLY idx_attendance_session_participant ON attendance_verification_logs(session_id, participant_id);
CREATE INDEX CONCURRENTLY idx_attendance_verified ON attendance_verification_logs(is_verified);
CREATE INDEX CONCURRENTLY idx_attendance_created ON attendance_verification_logs(created_at);

-- 🎯 ENTERPRISE PARTITIONING FOR SCALABILITY (for large-scale deployments)
-- Note: Uncomment for production deployment with millions of records
/*
CREATE TABLE training_sessions_2024 PARTITION OF training_sessions 
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE training_sessions_2025 PARTITION OF training_sessions 
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
*/

-- 🎯 ENTERPRISE VIEWS FOR BUSINESS INTELLIGENCE
CREATE OR REPLACE VIEW training_session_analytics AS
SELECT 
    ts.id,
    ts.session_number,
    ts.title,
    ts.status,
    ts.scheduled_start,
    ts.scheduled_end,
    ts.duration_minutes,
    ts.delivery_mode,
    ts.student_satisfaction_rating,
    ts.expert_performance_rating,
    ts.completion_percentage,
    
    -- Expert Information
    e.name as expert_name,
    e.tier as expert_tier,
    e.quality_score as expert_quality_score,
    
    -- Skill Information
    s.name as skill_name,
    s.category as skill_category,
    
    -- Enrollment Information
    enr.id as enrollment_id,
    enr.current_phase as enrollment_phase,
    
    -- Participant Counts
    COUNT(DISTINCT tsp.id) as total_participants,
    COUNT(DISTINCT CASE WHEN tsp.attendance_status = 'PRESENT' THEN tsp.id END) as present_participants,
    COUNT(DISTINCT CASE WHEN tsp.attendance_status = 'LATE' THEN tsp.id END) as late_participants,
    COUNT(DISTINCT CASE WHEN tsp.attendance_status = 'ABSENT' THEN tsp.id END) as absent_participants,
    
    -- Quality Metrics
    sqm.overall_quality_score,
    sqm.meets_quality_standards,
    
    -- Submission Metrics
    COUNT(DISTINCT es.id) as total_submissions,
    COUNT(DISTINCT CASE WHEN es.status = 'APPROVED' THEN es.id END) as approved_submissions,
    
    -- Timeliness Metrics
    CASE 
        WHEN ts.actual_start IS NOT NULL AND ts.actual_end IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ts.actual_end - ts.actual_start)) / 60
        ELSE NULL
    END as actual_duration_minutes

FROM training_sessions ts
LEFT JOIN experts e ON ts.expert_id = e.id
LEFT JOIN skills s ON ts.skill_id = s.id
LEFT JOIN enrollments enr ON ts.enrollment_id = enr.id
LEFT JOIN training_session_participants tsp ON ts.id = tsp.session_id
LEFT JOIN session_quality_metrics sqm ON ts.id = sqm.session_id
LEFT JOIN exercise_submissions es ON ts.id = es.session_id
GROUP BY 
    ts.id, e.id, s.id, enr.id, sqm.overall_quality_score, sqm.meets_quality_standards;

-- 🎯 ENTERPRISE FUNCTIONS FOR BUSINESS LOGIC
CREATE OR REPLACE FUNCTION update_session_quality_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update quality metrics when session is completed
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        -- Calculate average student rating
        UPDATE session_quality_metrics 
        SET average_student_rating = (
            SELECT AVG(student_rating)
            FROM training_session_participants
            WHERE session_id = NEW.id AND student_rating IS NOT NULL
        ),
        feedback_count = (
            SELECT COUNT(*)
            FROM training_session_participants
            WHERE session_id = NEW.id AND student_feedback_submitted_at IS NOT NULL
        ),
        updated_at = NOW()
        WHERE session_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_expert_availability()
RETURNS TRIGGER AS $$
DECLARE
    conflicting_sessions INTEGER;
BEGIN
    -- Check for expert scheduling conflicts
    SELECT COUNT(*)
    INTO conflicting_sessions
    FROM training_sessions
    WHERE expert_id = NEW.expert_id
    AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
    AND id != NEW.id
    AND tsrange(scheduled_start, scheduled_end) && tsrange(NEW.scheduled_start, NEW.scheduled_end);
    
    IF conflicting_sessions > 0 THEN
        RAISE EXCEPTION 'Expert has conflicting session scheduled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_participant_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically update attendance status based on join/leave times
    IF NEW.joined_at IS NOT NULL AND NEW.left_at IS NOT NULL THEN
        -- Calculate session duration attended
        DECLARE
            attended_minutes DECIMAL;
            total_minutes DECIMAL;
        BEGIN
            attended_minutes := EXTRACT(EPOCH FROM (NEW.left_at - NEW.joined_at)) / 60;
            SELECT duration_minutes INTO total_minutes 
            FROM training_sessions 
            WHERE id = NEW.session_id;
            
            -- Mark as present if attended more than 80% of session
            IF attended_minutes >= (total_minutes * 0.8) THEN
                NEW.attendance_status := 'PRESENT';
            ELSE
                NEW.attendance_status := 'LATE';
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🎯 ENTERPRISE TRIGGERS FOR DATA INTEGRITY
CREATE TRIGGER trigger_update_session_quality
    AFTER UPDATE OF status ON training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_quality_metrics();

CREATE TRIGGER trigger_check_expert_availability
    BEFORE INSERT OR UPDATE ON training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION check_expert_availability();

CREATE TRIGGER trigger_update_participant_attendance
    BEFORE INSERT OR UPDATE ON training_session_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_attendance();

-- 🎯 ENTERPRISE UPDATE TIMESTAMP TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_training_sessions_updated_at
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON training_session_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON training_session_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON exercise_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_metrics_updated_at
    BEFORE UPDATE ON session_quality_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON practical_workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 🎯 ENTERPRISE COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE training_sessions IS 'Enterprise training session management with quality tracking and scheduling';
COMMENT ON TABLE training_session_participants IS 'Session participants with attendance and engagement tracking';
COMMENT ON TABLE training_session_materials IS 'Training materials and exercises for hands-on learning';
COMMENT ON TABLE exercise_submissions IS 'Student exercise submissions with expert evaluation';
COMMENT ON TABLE session_quality_metrics IS 'Quality metrics for training sessions with expert performance tracking';
COMMENT ON TABLE practical_workspaces IS 'Hands-on practical workspaces for skill application';
COMMENT ON TABLE attendance_verification_logs IS 'Secure attendance verification with multiple validation methods';

-- 🎯 ENTERPRISE DATA SEEDING FOR INITIAL SETUP
INSERT INTO training_sessions (
    enrollment_id,
    expert_id,
    skill_id,
    session_number,
    title,
    description,
    session_type,
    difficulty_level,
    duration_minutes,
    max_participants,
    scheduled_start,
    scheduled_end,
    delivery_mode,
    status
) 
SELECT 
    e.id as enrollment_id,
    e.expert_id,
    e.skill_id,
    1 as session_number,
    'Mindset Foundation: Wealth Consciousness' as title,
    'Introduction to wealth mindset and financial psychology' as description,
    'THEORY' as session_type,
    'BEGINNER' as difficulty_level,
    120 as duration_minutes,
    5 as max_participants,
    NOW() + INTERVAL '1 day' as scheduled_start,
    NOW() + INTERVAL '1 day 2 hours' as scheduled_end,
    'VIRTUAL' as delivery_mode,
    'SCHEDULED' as status
FROM enrollments e
WHERE e.status = 'ACTIVE'
AND e.current_phase = 'MINDSET'
LIMIT 100; -- Seed initial sessions for active enrollments

-- 🎯 ENTERPRISE MIGRATION COMPLETION LOG
INSERT INTO migration_logs (migration_name, version, executed_at, status)
VALUES ('004-training-sessions', '1.0.0', NOW(), 'COMPLETED');

-- 🏗️ ENTERPRISE ROLLBACK SCRIPT (for safe deployments)
/*
-- Uncomment and run if rollback is needed
DROP VIEW IF EXISTS training_session_analytics;
DROP TABLE IF EXISTS attendance_verification_logs CASCADE;
DROP TABLE IF EXISTS practical_workspaces CASCADE;
DROP TABLE IF EXISTS session_quality_metrics CASCADE;
DROP TABLE IF EXISTS exercise_submissions CASCADE;
DROP TABLE IF EXISTS training_session_materials CASCADE;
DROP TABLE IF EXISTS training_session_participants CASCADE;
DROP TABLE IF EXISTS training_sessions CASCADE;

DROP TYPE IF EXISTS training_session_type CASCADE;
DROP TYPE IF EXISTS training_session_status CASCADE;
DROP TYPE IF EXISTS delivery_mode_type CASCADE;
DROP TYPE IF EXISTS participant_status_type CASCADE;
DROP TYPE IF EXISTS attendance_status_type CASCADE;
DROP TYPE IF EXISTS attendance_method_type CASCADE;
DROP TYPE IF EXISTS material_type CASCADE;
DROP TYPE IF EXISTS exercise_type CASCADE;
DROP TYPE IF EXISTS submission_status_type CASCADE;
DROP TYPE IF EXISTS grade_type CASCADE;
DROP TYPE IF EXISTS workspace_type CASCADE;
DROP TYPE IF EXISTS workspace_status_type CASCADE;
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS cancellation_reason_type CASCADE;
*/