/**
 * 🎯 MOSA FORGE: Enterprise Quality Metrics Migration
 * 
 * @file 006-quality-metrics.sql
 * @description Enterprise quality tracking system for expert performance monitoring
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality monitoring
 * - Auto-enforcement system
 * - Dynamic tier management
 * - Performance-based bonuses/penalties
 * - Student protection mechanisms
 */

-- 🏗️ Enable UUID extension for enterprise identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🎯 ENTERPRISE QUALITY METRICS TABLE
CREATE TABLE quality_metrics (
    -- 🆔 Enterprise Primary Key with UUID for distributed systems
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔗 Enterprise Relationships
    expert_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    
    -- 🎯 Core Quality Metrics (Real-time tracking)
    overall_score DECIMAL(3,2) NOT NULL CHECK (overall_score >= 1.0 AND overall_score <= 5.0),
    completion_rate DECIMAL(5,4) NOT NULL CHECK (completion_rate >= 0.0 AND completion_rate <= 1.0),
    average_rating DECIMAL(3,2) NOT NULL CHECK (average_rating >= 1.0 AND average_rating <= 5.0),
    response_time_hours INTEGER NOT NULL CHECK (response_time_hours >= 0 AND response_time_hours <= 168), -- 1 week max
    
    -- 📊 Detailed Performance Metrics
    student_satisfaction_score DECIMAL(3,2) CHECK (student_satisfaction_score >= 1.0 AND student_satisfaction_score <= 5.0),
    weekly_progress_rate DECIMAL(5,4) CHECK (weekly_progress_rate >= 0.0 AND weekly_progress_rate <= 1.0),
    assignment_completion_rate DECIMAL(5,4) CHECK (assignment_completion_rate >= 0.0 AND assignment_completion_rate <= 1.0),
    attendance_rate DECIMAL(5,4) CHECK (attendance_rate >= 0.0 AND attendance_rate <= 1.0),
    
    -- 🏆 Tier & Bonus Calculations
    calculated_tier VARCHAR(20) NOT NULL CHECK (calculated_tier IN ('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION')),
    quality_bonus_eligible BOOLEAN DEFAULT FALSE,
    bonus_percentage DECIMAL(4,2) DEFAULT 0.0 CHECK (bonus_percentage >= 0.0 AND bonus_percentage <= 20.0),
    penalty_percentage DECIMAL(4,2) DEFAULT 0.0 CHECK (penalty_percentage >= 0.0 AND penalty_percentage <= 20.0),
    
    -- 🚨 Auto-Enforcement Flags
    requires_improvement_plan BOOLEAN DEFAULT FALSE,
    auto_pause_triggered BOOLEAN DEFAULT FALSE,
    tier_demotion_eligible BOOLEAN DEFAULT FALSE,
    quality_warning_issued BOOLEAN DEFAULT FALSE,
    
    -- 📈 Statistical Metrics
    total_sessions INTEGER DEFAULT 0 CHECK (total_sessions >= 0),
    completed_sessions INTEGER DEFAULT 0 CHECK (completed_sessions >= 0 AND completed_sessions <= total_sessions),
    student_feedback_count INTEGER DEFAULT 0 CHECK (student_feedback_count >= 0),
    escalation_count INTEGER DEFAULT 0 CHECK (escalation_count >= 0),
    
    -- 🎯 Quality Thresholds (Configurable)
    quality_threshold DECIMAL(3,2) DEFAULT 4.0 CHECK (quality_threshold >= 3.0 AND quality_threshold <= 5.0),
    completion_threshold DECIMAL(5,4) DEFAULT 0.7 CHECK (completion_threshold >= 0.5 AND completion_threshold <= 1.0),
    response_threshold_hours INTEGER DEFAULT 24 CHECK (response_threshold_hours >= 1 AND response_threshold_hours <= 72),
    
    -- ✅ Validation & Status
    is_valid BOOLEAN DEFAULT TRUE,
    validation_checksum VARCHAR(64), -- SHA-256 for data integrity
    last_calculated_at TIMESTAMPTZ NOT NULL,
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    
    -- 🔐 Enterprise Foreign Key Constraints
    CONSTRAINT fk_quality_metrics_expert 
        FOREIGN KEY (expert_id) 
        REFERENCES experts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_quality_metrics_enrollment 
        FOREIGN KEY (enrollment_id) 
        REFERENCES enrollments(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- 🎯 Enterprise Unique Constraints
    CONSTRAINT uq_quality_metrics_expert_enrollment 
        UNIQUE (expert_id, enrollment_id)
);

-- 🎯 ENTERPRISE EXPERT TIERS TABLE
CREATE TABLE expert_tiers (
    -- 🆔 Enterprise Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expert_id UUID NOT NULL,
    
    -- 🏆 Tier Configuration
    current_tier VARCHAR(20) NOT NULL CHECK (current_tier IN ('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION')),
    previous_tier VARCHAR(20) CHECK (previous_tier IN ('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION')),
    
    -- 📊 Tier Limits & Capacity
    max_students INTEGER NOT NULL CHECK (max_students >= 0),
    current_students INTEGER DEFAULT 0 CHECK (current_students >= 0 AND current_students <= max_students),
    session_capacity INTEGER NOT NULL CHECK (session_capacity >= 0),
    
    -- 💰 Financial Configuration
    base_earnings_per_student DECIMAL(10,2) NOT NULL CHECK (base_earnings_per_student >= 0),
    bonus_percentage DECIMAL(4,2) NOT NULL CHECK (bonus_percentage >= 0.0 AND bonus_percentage <= 20.0),
    total_earnings_potential DECIMAL(10,2) GENERATED ALWAYS AS (base_earnings_per_student * (1 + bonus_percentage/100)) STORED,
    
    -- 🎯 Tier Requirements
    min_quality_score DECIMAL(3,2) NOT NULL CHECK (min_quality_score >= 3.0 AND min_quality_score <= 5.0),
    min_completion_rate DECIMAL(5,4) NOT NULL CHECK (min_completion_rate >= 0.5 AND min_completion_rate <= 1.0),
    max_response_time_hours INTEGER NOT NULL CHECK (max_response_time_hours >= 1 AND max_response_time_hours <= 72),
    
    -- 🔄 Tier Transition Tracking
    tier_changed_at TIMESTAMPTZ,
    days_in_current_tier INTEGER DEFAULT 0 CHECK (days_in_current_tier >= 0),
    promotion_eligible BOOLEAN DEFAULT FALSE,
    demotion_risk BOOLEAN DEFAULT FALSE,
    
    -- 📈 Performance History
    consecutive_quality_cycles INTEGER DEFAULT 0 CHECK (consecutive_quality_cycles >= 0),
    quality_consistency_score DECIMAL(3,2) CHECK (quality_consistency_score >= 1.0 AND quality_consistency_score <= 5.0),
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    -- 🔐 Enterprise Foreign Key
    CONSTRAINT fk_expert_tiers_expert 
        FOREIGN KEY (expert_id) 
        REFERENCES experts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- 🎯 Enterprise Business Rules
    CONSTRAINT chk_tier_progression 
        CHECK (
            (previous_tier IS NULL) OR 
            (
                (previous_tier = 'PROBATION' AND current_tier IN ('DEVELOPING', 'STANDARD')) OR
                (previous_tier = 'DEVELOPING' AND current_tier IN ('STANDARD', 'PROBATION')) OR
                (previous_tier = 'STANDARD' AND current_tier IN ('SENIOR', 'DEVELOPING')) OR
                (previous_tier = 'SENIOR' AND current_tier IN ('MASTER', 'STANDARD')) OR
                (previous_tier = 'MASTER' AND current_tier IN ('SENIOR'))
            )
        )
);

-- 🎯 ENTERPRISE QUALITY AUDIT LOGS TABLE
CREATE TABLE quality_audit_logs (
    -- 🆔 Enterprise Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔗 Audit Relationships
    expert_id UUID NOT NULL,
    quality_metric_id UUID,
    enrollment_id UUID,
    admin_id UUID, -- For manual interventions
    
    -- 🚨 Audit Event Details
    audit_type VARCHAR(50) NOT NULL CHECK (audit_type IN (
        'AUTO_ENFORCEMENT', 'TIER_CHANGE', 'QUALITY_CHECK', 
        'MANUAL_REVIEW', 'STUDENT_ESCALATION', 'SYSTEM_ALERT'
    )),
    audit_severity VARCHAR(20) NOT NULL CHECK (audit_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- 📝 Audit Details
    event_description TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    changes_detected JSONB,
    
    -- 🎯 Quality Metrics Snapshot
    quality_score_snapshot DECIMAL(3,2),
    completion_rate_snapshot DECIMAL(5,4),
    response_time_snapshot INTEGER,
    tier_snapshot VARCHAR(20),
    
    -- ✅ Enforcement Actions
    action_taken VARCHAR(100),
    action_effective_from TIMESTAMPTZ,
    action_effective_until TIMESTAMPTZ,
    requires_follow_up BOOLEAN DEFAULT FALSE,
    
    -- 🔍 Investigation Details
    investigation_notes TEXT,
    evidence_attachments JSONB, -- URLs or references to evidence
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    
    -- 🔐 Enterprise Foreign Keys
    CONSTRAINT fk_quality_audit_expert 
        FOREIGN KEY (expert_id) 
        REFERENCES experts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_quality_audit_metric 
        FOREIGN KEY (quality_metric_id) 
        REFERENCES quality_metrics(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_quality_audit_enrollment 
        FOREIGN KEY (enrollment_id) 
        REFERENCES enrollments(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

-- 🎯 ENTERPRISE IMPROVEMENT PLANS TABLE
CREATE TABLE improvement_plans (
    -- 🆔 Enterprise Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔗 Plan Relationships
    expert_id UUID NOT NULL,
    quality_metric_id UUID NOT NULL,
    assigned_by UUID, -- Admin or system
    
    -- 📋 Plan Details
    plan_title VARCHAR(200) NOT NULL,
    plan_description TEXT NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN (
        'PERFORMANCE', 'QUALITY', 'RESPONSIVENESS', 'COMPLETION', 'TECHNICAL'
    )),
    
    -- 🎯 Improvement Targets
    target_quality_score DECIMAL(3,2) CHECK (target_quality_score >= 3.0 AND target_quality_score <= 5.0),
    target_completion_rate DECIMAL(5,4) CHECK (target_completion_rate >= 0.5 AND target_completion_rate <= 1.0),
    target_response_time_hours INTEGER CHECK (target_response_time_hours >= 1 AND target_response_time_hours <= 72),
    
    -- 📅 Plan Schedule
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    duration_days INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM (end_date - start_date))) STORED,
    
    -- ✅ Progress Tracking
    current_progress DECIMAL(5,4) DEFAULT 0.0 CHECK (current_progress >= 0.0 AND current_progress <= 1.0),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED')),
    
    -- 🛠️ Action Items
    action_items JSONB NOT NULL, -- Structured action items with deadlines
    resources_provided JSONB, -- Learning materials, tools, support
    
    -- 📊 Results & Outcomes
    final_quality_score DECIMAL(3,2) CHECK (final_quality_score >= 1.0 AND final_quality_score <= 5.0),
    improvement_percentage DECIMAL(5,2) CHECK (improvement_percentage >= -100.0 AND improvement_percentage <= 100.0),
    outcome_notes TEXT,
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 🔐 Enterprise Foreign Keys
    CONSTRAINT fk_improvement_plans_expert 
        FOREIGN KEY (expert_id) 
        REFERENCES experts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_improvement_plans_metric 
        FOREIGN KEY (quality_metric_id) 
        REFERENCES quality_metrics(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- 🎯 Enterprise Business Rules
    CONSTRAINT chk_improvement_plan_dates 
        CHECK (end_date > start_date),
        
    CONSTRAINT chk_improvement_duration 
        CHECK (EXTRACT(DAY FROM (end_date - start_date)) BETWEEN 1 AND 90) -- 1-90 days max
);

-- 🎯 ENTERPRISE QUALITY THRESHOLDS CONFIGURATION TABLE
CREATE TABLE quality_thresholds_config (
    -- 🆔 Enterprise Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🎯 Threshold Configuration
    config_name VARCHAR(100) UNIQUE NOT NULL,
    config_description TEXT,
    
    -- 📊 Quality Thresholds
    master_tier_threshold DECIMAL(3,2) NOT NULL CHECK (master_tier_threshold >= 4.5 AND master_tier_threshold <= 5.0),
    senior_tier_threshold DECIMAL(3,2) NOT NULL CHECK (senior_tier_threshold >= 4.3 AND senior_tier_threshold <= 4.7),
    standard_tier_threshold DECIMAL(3,2) NOT NULL CHECK (standard_tier_threshold >= 4.0 AND standard_tier_threshold <= 4.5),
    developing_tier_threshold DECIMAL(3,2) NOT NULL CHECK (developing_tier_threshold >= 3.5 AND developing_tier_threshold <= 4.2),
    
    -- 📈 Completion Thresholds
    min_completion_rate DECIMAL(5,4) NOT NULL CHECK (min_completion_rate >= 0.5 AND min_completion_rate <= 0.9),
    target_completion_rate DECIMAL(5,4) NOT NULL CHECK (target_completion_rate >= 0.7 AND target_completion_rate <= 1.0),
    
    -- ⚡ Response Time Thresholds
    excellent_response_hours INTEGER NOT NULL CHECK (excellent_response_hours >= 1 AND excellent_response_hours <= 12),
    good_response_hours INTEGER NOT NULL CHECK (good_response_hours >= 6 AND good_response_hours <= 24),
    acceptable_response_hours INTEGER NOT NULL CHECK (acceptable_response_hours >= 12 AND acceptable_response_hours <= 48),
    
    -- 💰 Bonus & Penalty Configuration
    max_bonus_percentage DECIMAL(4,2) NOT NULL CHECK (max_bonus_percentage >= 0.0 AND max_bonus_percentage <= 20.0),
    max_penalty_percentage DECIMAL(4,2) NOT NULL CHECK (max_penalty_percentage >= 0.0 AND max_penalty_percentage <= 20.0),
    bonus_calculation_interval_days INTEGER NOT NULL CHECK (bonus_calculation_interval_days IN (7, 14, 30)),
    
    -- 🔄 Auto-Enforcement Rules
    auto_pause_trigger_days INTEGER NOT NULL CHECK (auto_pause_trigger_days >= 1 AND auto_pause_trigger_days <= 30),
    tier_review_interval_days INTEGER NOT NULL CHECK (tier_review_interval_days >= 7 AND tier_review_interval_days <= 90),
    quality_check_frequency_hours INTEGER NOT NULL CHECK (quality_check_frequency_hours IN (1, 2, 4, 6, 12, 24)),
    
    -- ✅ Status & Versioning
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM'
);

-- 🎯 ENTERPRISE STUDENT FEEDBACK TABLE (Quality Input)
CREATE TABLE student_feedback_quality (
    -- 🆔 Enterprise Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🔗 Feedback Relationships
    student_id UUID NOT NULL,
    expert_id UUID NOT NULL,
    enrollment_id UUID NOT NULL,
    
    -- ⭐ Rating Components
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    knowledge_rating INTEGER CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    responsiveness_rating INTEGER CHECK (responsiveness_rating >= 1 AND responsiveness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    
    -- 📝 Qualitative Feedback
    feedback_text TEXT,
    strengths_mentioned TEXT,
    areas_for_improvement TEXT,
    
    -- 🎯 Quality Flags
    would_recommend BOOLEAN,
    reported_issues JSONB, -- Structured issue reporting
    escalation_requested BOOLEAN DEFAULT FALSE,
    
    -- ✅ Validation & Moderation
    is_verified BOOLEAN DEFAULT FALSE,
    moderated_by UUID,
    moderation_notes TEXT,
    moderation_status VARCHAR(20) DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'EDITED')),
    
    -- 🏗️ Enterprise Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 🔐 Enterprise Foreign Keys
    CONSTRAINT fk_student_feedback_student 
        FOREIGN KEY (student_id) 
        REFERENCES students(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_student_feedback_expert 
        FOREIGN KEY (expert_id) 
        REFERENCES experts(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_student_feedback_enrollment 
        FOREIGN KEY (enrollment_id) 
        REFERENCES enrollments(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- 🏗️ ENTERPRISE INDEXES FOR PERFORMANCE

-- 🔍 Quality Metrics Performance Indexes
CREATE INDEX idx_quality_metrics_expert_id ON quality_metrics(expert_id);
CREATE INDEX idx_quality_metrics_overall_score ON quality_metrics(overall_score);
CREATE INDEX idx_quality_metrics_completion_rate ON quality_metrics(completion_rate);
CREATE INDEX idx_quality_metrics_calculated_tier ON quality_metrics(calculated_tier);
CREATE INDEX idx_quality_metrics_last_calculated ON quality_metrics(last_calculated_at);
CREATE INDEX idx_quality_metrics_valid ON quality_metrics(is_valid) WHERE is_valid = true;

-- 🔍 Expert Tiers Performance Indexes
CREATE INDEX idx_expert_tiers_expert_id ON expert_tiers(expert_id);
CREATE INDEX idx_expert_tiers_current_tier ON expert_tiers(current_tier);
CREATE INDEX idx_expert_tiers_promotion_eligible ON expert_tiers(promotion_eligible) WHERE promotion_eligible = true;
CREATE INDEX idx_expert_tiers_demotion_risk ON expert_tiers(demotion_risk) WHERE demotion_risk = true;
CREATE INDEX idx_expert_tiers_effective_date ON expert_tiers(effective_from, effective_until);

-- 🔍 Quality Audit Logs Performance Indexes
CREATE INDEX idx_quality_audit_expert_id ON quality_audit_logs(expert_id);
CREATE INDEX idx_quality_audit_created_at ON quality_audit_logs(created_at);
CREATE INDEX idx_quality_audit_severity ON quality_audit_logs(audit_severity);
CREATE INDEX idx_quality_audit_type ON quality_audit_logs(audit_type);
CREATE INDEX idx_quality_audit_resolved ON quality_audit_logs(resolved_at) WHERE resolved_at IS NULL;

-- 🔍 Improvement Plans Performance Indexes
CREATE INDEX idx_improvement_plans_expert_id ON improvement_plans(expert_id);
CREATE INDEX idx_improvement_plans_status ON improvement_plans(status);
CREATE INDEX idx_improvement_plans_dates ON improvement_plans(start_date, end_date);
CREATE INDEX idx_improvement_plans_progress ON improvement_plans(current_progress);

-- 🔍 Student Feedback Performance Indexes
CREATE INDEX idx_student_feedback_expert_id ON student_feedback_quality(expert_id);
CREATE INDEX idx_student_feedback_student_id ON student_feedback_quality(student_id);
CREATE INDEX idx_student_feedback_rating ON student_feedback_quality(overall_rating);
CREATE INDEX idx_student_feedback_created_at ON student_feedback_quality(created_at);
CREATE INDEX idx_student_feedback_moderation ON student_feedback_quality(moderation_status);

-- 🏗️ ENTERPRISE PARTITIONING STRATEGY (For High-Scale Deployment)
-- Note: Uncomment for production deployment with 100K+ experts

-- CREATE TABLE quality_metrics_template (LIKE quality_metrics INCLUDING ALL);
-- CREATE TABLE quality_audit_logs_template (LIKE quality_audit_logs INCLUDING ALL);

-- 🎯 ENTERPRISE FUNCTIONS FOR QUALITY CALCULATIONS

-- 🏗️ Function to calculate overall quality score
CREATE OR REPLACE FUNCTION calculate_overall_quality_score(
    p_completion_rate DECIMAL,
    p_average_rating DECIMAL,
    p_response_time INTEGER,
    p_student_satisfaction DECIMAL DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    base_score DECIMAL;
    satisfaction_weight DECIMAL := 0.2;
    completion_weight DECIMAL := 0.3;
    rating_weight DECIMAL := 0.4;
    response_weight DECIMAL := 0.1;
BEGIN
    -- Calculate base score from core metrics
    base_score := (
        (p_completion_rate * 5 * completion_weight) +
        (p_average_rating * rating_weight) +
        (CASE 
            WHEN p_response_time <= 12 THEN 5.0 * response_weight
            WHEN p_response_time <= 24 THEN 4.0 * response_weight
            WHEN p_response_time <= 48 THEN 3.0 * response_weight
            ELSE 2.0 * response_weight
        END)
    );
    
    -- Apply satisfaction adjustment if available
    IF p_student_satisfaction IS NOT NULL THEN
        base_score := base_score + (p_student_satisfaction * satisfaction_weight);
    END IF;
    
    -- Ensure score is within bounds
    RETURN GREATEST(1.0, LEAST(5.0, base_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 🏗️ Function to determine expert tier
CREATE OR REPLACE FUNCTION determine_expert_tier(
    p_quality_score DECIMAL,
    p_completion_rate DECIMAL,
    p_response_time INTEGER,
    p_config_id UUID DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
    config_record quality_thresholds_config%ROWTYPE;
BEGIN
    -- Get latest configuration if not specified
    IF p_config_id IS NULL THEN
        SELECT * INTO config_record 
        FROM quality_thresholds_config 
        WHERE is_active = true 
        ORDER BY effective_from DESC 
        LIMIT 1;
    ELSE
        SELECT * INTO config_record 
        FROM quality_thresholds_config 
        WHERE id = p_config_id;
    END IF;
    
    -- Tier determination logic
    IF p_quality_score >= config_record.master_tier_threshold 
       AND p_completion_rate >= config_record.target_completion_rate 
       AND p_response_time <= config_record.excellent_response_hours THEN
        RETURN 'MASTER';
    ELSIF p_quality_score >= config_record.senior_tier_threshold 
          AND p_completion_rate >= config_record.target_completion_rate 
          AND p_response_time <= config_record.good_response_hours THEN
        RETURN 'SENIOR';
    ELSIF p_quality_score >= config_record.standard_tier_threshold 
          AND p_completion_rate >= config_record.min_completion_rate 
          AND p_response_time <= config_record.acceptable_response_hours THEN
        RETURN 'STANDARD';
    ELSIF p_quality_score >= config_record.developing_tier_threshold 
          AND p_completion_rate >= config_record.min_completion_rate * 0.9 THEN
        RETURN 'DEVELOPING';
    ELSE
        RETURN 'PROBATION';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 🏗️ Function to calculate quality bonus percentage
CREATE OR REPLACE FUNCTION calculate_quality_bonus(
    p_quality_score DECIMAL,
    p_completion_rate DECIMAL,
    p_tier VARCHAR,
    p_config_id UUID DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
    config_record quality_thresholds_config%ROWTYPE;
    base_bonus DECIMAL := 0.0;
    score_bonus DECIMAL := 0.0;
    completion_bonus DECIMAL := 0.0;
BEGIN
    -- Get configuration
    IF p_config_id IS NULL THEN
        SELECT * INTO config_record 
        FROM quality_thresholds_config 
        WHERE is_active = true 
        ORDER BY effective_from DESC 
        LIMIT 1;
    ELSE
        SELECT * INTO config_record 
        FROM quality_thresholds_config 
        WHERE id = p_config_id;
    END IF;
    
    -- Tier-based base bonus
    CASE p_tier
        WHEN 'MASTER' THEN base_bonus := 20.0;
        WHEN 'SENIOR' THEN base_bonus := 10.0;
        WHEN 'STANDARD' THEN base_bonus := 0.0;
        ELSE base_bonus := 0.0;
    END CASE;
    
    -- Quality score bonus (up to 5% additional)
    IF p_quality_score >= 4.8 THEN
        score_bonus := 5.0;
    ELSIF p_quality_score >= 4.5 THEN
        score_bonus := 3.0;
    ELSIF p_quality_score >= 4.3 THEN
        score_bonus := 1.0;
    END IF;
    
    -- Completion rate bonus (up to 3% additional)
    IF p_completion_rate >= 0.9 THEN
        completion_bonus := 3.0;
    ELSIF p_completion_rate >= 0.8 THEN
        completion_bonus := 2.0;
    ELSIF p_completion_rate >= 0.75 THEN
        completion_bonus := 1.0;
    END IF;
    
    -- Cap at maximum bonus percentage
    RETURN LEAST(config_record.max_bonus_percentage, base_bonus + score_bonus + completion_bonus);
END;
$$ LANGUAGE plpgsql STABLE;

-- 🏗️ ENTERPRISE TRIGGERS FOR DATA INTEGRITY

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all enterprise tables
CREATE TRIGGER update_quality_metrics_updated_at 
    BEFORE UPDATE ON quality_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expert_tiers_updated_at 
    BEFORE UPDATE ON expert_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_improvement_plans_updated_at 
    BEFORE UPDATE ON improvement_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_thresholds_updated_at 
    BEFORE UPDATE ON quality_thresholds_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_feedback_updated_at 
    BEFORE UPDATE ON student_feedback_quality 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🏗️ ENTERPRISE VIEWS FOR REPORTING AND ANALYTICS

-- 🎯 Comprehensive Quality Dashboard View
CREATE VIEW quality_dashboard AS
SELECT 
    e.id as expert_id,
    e.name as expert_name,
    e.email as expert_email,
    et.current_tier,
    et.max_students,
    et.current_students,
    qm.overall_score,
    qm.completion_rate,
    qm.average_rating,
    qm.response_time_hours,
    qm.calculated_tier,
    qm.quality_bonus_eligible,
    qm.bonus_percentage,
    qm.requires_improvement_plan,
    qm.auto_pause_triggered,
    COUNT(DISTINCT sf.id) as feedback_count,
    AVG(sf.overall_rating) as avg_feedback_rating,
    COUNT(ip.id) as active_improvement_plans
FROM experts e
LEFT JOIN expert_tiers et ON e.id = et.expert_id AND et.effective_until IS NULL
LEFT JOIN quality_metrics qm ON e.id = qm.expert_id AND qm.is_valid = true
LEFT JOIN student_feedback_quality sf ON e.id = sf.expert_id AND sf.moderation_status = 'APPROVED'
LEFT JOIN improvement_plans ip ON e.id = ip.expert_id AND ip.status = 'ACTIVE'
GROUP BY 
    e.id, e.name, e.email, et.current_tier, et.max_students, et.current_students,
    qm.overall_score, qm.completion_rate, qm.average_rating, qm.response_time_hours,
    qm.calculated_tier, qm.quality_bonus_eligible, qm.bonus_percentage,
    qm.requires_improvement_plan, qm.auto_pause_triggered;

-- 🎯 Quality Trends Over Time View
CREATE VIEW quality_trends AS
SELECT 
    expert_id,
    DATE(created_at) as metric_date,
    AVG(overall_score) as daily_avg_score,
    AVG(completion_rate) as daily_avg_completion,
    AVG(response_time_hours) as daily_avg_response_time,
    COUNT(*) as metrics_count
FROM quality_metrics
WHERE is_valid = true
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY expert_id, DATE(created_at);

-- 🏗️ ENTERPRISE DATA SEEDING FOR QUALITY THRESHOLDS

-- Insert default quality thresholds configuration
INSERT INTO quality_thresholds_config (
    config_name,
    config_description,
    master_tier_threshold,
    senior_tier_threshold,
    standard_tier_threshold,
    developing_tier_threshold,
    min_completion_rate,
    target_completion_rate,
    excellent_response_hours,
    good_response_hours,
    acceptable_response_hours,
    max_bonus_percentage,
    max_penalty_percentage,
    bonus_calculation_interval_days,
    auto_pause_trigger_days,
    tier_review_interval_days,
    quality_check_frequency_hours,
    version,
    created_by
) VALUES (
    'ENTERPRISE_DEFAULT_2024',
    'Default quality thresholds for MOSA FORGE enterprise platform',
    4.7,  -- Master tier threshold
    4.3,  -- Senior tier threshold  
    4.0,  -- Standard tier threshold
    3.5,  -- Developing tier threshold
    0.7,  -- Minimum completion rate
    0.8,  -- Target completion rate
    12,   -- Excellent response (hours)
    24,   -- Good response (hours)
    48,   -- Acceptable response (hours)
    20.0, -- Maximum bonus percentage
    20.0, -- Maximum penalty percentage
    30,   -- Bonus calculation interval (days)
    7,    -- Auto-pause trigger (days)
    30,   -- Tier review interval (days)
    6,    -- Quality check frequency (hours)
    '1.0.0',
    'SYSTEM'
);

-- 🏗️ ENTERPRISE CONSTRAINTS FOR DATA VALIDATION

-- Add constraint to ensure only one active tier per expert
CREATE UNIQUE INDEX idx_expert_tiers_one_active 
ON expert_tiers (expert_id) 
WHERE effective_until IS NULL;

-- Add constraint for quality metrics checksum validation
CREATE OR REPLACE FUNCTION generate_quality_checksum()
RETURNS TRIGGER AS $$
BEGIN
    NEW.validation_checksum = encode(
        digest(
            NEW.expert_id::text || NEW.overall_score::text || NEW.completion_rate::text || 
            NEW.average_rating::text || NEW.response_time_hours::text,
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_quality_metrics_checksum
    BEFORE INSERT OR UPDATE ON quality_metrics
    FOR EACH ROW EXECUTE FUNCTION generate_quality_checksum();

-- 🎯 MIGRATION COMPLETION MESSAGE
DO $$ 
BEGIN
    RAISE NOTICE '🎉 MOSA FORGE Quality Metrics Migration Completed Successfully!';
    RAISE NOTICE '📊 Enterprise Quality Tracking System: ACTIVE';
    RAISE NOTICE '🛡️  Auto-Enforcement System: READY';
    RAISE NOTICE '🏆 Dynamic Tier Management: OPERATIONAL';
    RAISE NOTICE '💰 Performance-Based Bonuses: CONFIGURED';
    RAISE NOTICE '🚀 Quality Guarantee System: DEPLOYED';
END $$;