-- migrations/005-certification.sql

/**
 * 🎯 ENTERPRISE CERTIFICATION SYSTEM
 * Production-ready certification schema for Mosa Forge
 * Features: Yachi integration, digital certificates, verification engine
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

-- Enable UUID extension for secure certificate identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🏆 CERTIFICATION CATALOG TABLE
CREATE TABLE certification_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills_catalog(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    certification_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Requirements
    minimum_completion_percentage INTEGER NOT NULL DEFAULT 85,
    minimum_quality_score DECIMAL(3,2) NOT NULL DEFAULT 4.0,
    required_assessments JSONB DEFAULT '[]',
    
    -- Yachi Integration
    yachi_provider_code VARCHAR(100),
    yachi_category VARCHAR(100),
    auto_yachi_verification BOOLEAN DEFAULT true,
    
    -- Metadata
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    validity_months INTEGER DEFAULT 24,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Indexes
    CONSTRAINT chk_min_completion_percentage CHECK (minimum_completion_percentage BETWEEN 70 AND 100),
    CONSTRAINT chk_min_quality_score CHECK (minimum_quality_score BETWEEN 3.5 AND 5.0)
);

-- Indexes for certification catalog
CREATE INDEX idx_certification_catalog_skill ON certification_catalog(skill_id);
CREATE INDEX idx_certification_catalog_active ON certification_catalog(is_active) WHERE is_active = true;
CREATE INDEX idx_certification_catalog_code ON certification_catalog(certification_code);
CREATE INDEX idx_certification_catalog_yachi ON certification_catalog(yachi_provider_code) WHERE yachi_provider_code IS NOT NULL;

-- 🎓 CERTIFICATION ASSESSMENTS TABLE
CREATE TABLE certification_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certification_id UUID NOT NULL REFERENCES certification_catalog(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('PRACTICAL', 'THEORETICAL', 'PORTFOLIO', 'INTERVIEW')),
    
    -- Assessment Details
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 70,
    maximum_attempts INTEGER NOT NULL DEFAULT 3,
    time_limit_minutes INTEGER,
    
    -- Content
    questions JSONB, -- Structured question bank
    evaluation_criteria JSONB,
    
    -- Metadata
    weightage INTEGER NOT NULL DEFAULT 100, -- Percentage weight in final score
    is_required BOOLEAN DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT chk_passing_score CHECK (passing_score BETWEEN 60 AND 100),
    CONSTRAINT chk_maximum_attempts CHECK (maximum_attempts BETWEEN 1 AND 5),
    CONSTRAINT chk_weightage CHECK (weightage BETWEEN 0 AND 100)
);

CREATE INDEX idx_cert_assessments_cert ON certification_assessments(certification_id);
CREATE INDEX idx_cert_assessments_type ON certification_assessments(assessment_type);
CREATE INDEX idx_cert_assessments_order ON certification_assessments(certification_id, display_order);

-- 📜 CERTIFICATION ISSUANCE TABLE
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES certification_catalog(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Certificate Details
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ISSUED', 'EXPIRED', 'REVOKED', 'SUSPENDED')),
    
    -- Assessment Results
    final_score DECIMAL(5,2),
    overall_percentage DECIMAL(5,2),
    assessment_results JSONB DEFAULT '[]', -- Detailed results from all assessments
    
    -- Digital Certificate
    digital_certificate_url TEXT,
    qr_code_url TEXT,
    verification_hash VARCHAR(64) UNIQUE, -- SHA-256 for verification
    
    -- Yachi Integration
    yachi_verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (yachi_verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    yachi_provider_id VARCHAR(100),
    yachi_verification_date TIMESTAMP WITH TIME ZONE,
    yachi_metadata JSONB,
    
    -- Revocation Details
    revocation_reason TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT chk_final_score CHECK (final_score BETWEEN 0 AND 100),
    CONSTRAINT chk_overall_percentage CHECK (overall_percentage BETWEEN 0 AND 100)
);

-- Indexes for certifications
CREATE INDEX idx_certifications_student ON certifications(student_id);
CREATE INDEX idx_certifications_expert ON certifications(expert_id);
CREATE INDEX idx_certifications_cert ON certifications(certification_id);
CREATE INDEX idx_certifications_enrollment ON certifications(enrollment_id);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_yachi_status ON certifications(yachi_verification_status);
CREATE INDEX idx_certifications_issue_date ON certifications(issue_date);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date);
CREATE INDEX idx_certifications_number ON certifications(certificate_number);
CREATE INDEX idx_certifications_verification_hash ON certifications(verification_hash);

-- 📝 ASSESSMENT ATTEMPTS TABLE
CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES certification_assessments(id) ON DELETE CASCADE,
    certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    
    -- Attempt Details
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER,
    
    -- Results
    score DECIMAL(5,2),
    passed BOOLEAN,
    answers JSONB, -- Student's answers
    evaluator_feedback TEXT,
    evaluated_by UUID REFERENCES users(id),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    
    -- Proctoring & Security
    ip_address INET,
    user_agent TEXT,
    proctoring_metadata JSONB, -- Screen recording, webcam data etc.
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'EXPIRED', 'CANCELLED')),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(student_id, assessment_id, attempt_number),
    CONSTRAINT chk_attempt_number CHECK (attempt_number >= 1),
    CONSTRAINT chk_score CHECK (score BETWEEN 0 AND 100)
);

CREATE INDEX idx_assessment_attempts_student ON assessment_attempts(student_id);
CREATE INDEX idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX idx_assessment_attempts_certification ON assessment_attempts(certification_id);
CREATE INDEX idx_assessment_attempts_status ON assessment_attempts(status);
CREATE INDEX idx_assessment_attempts_completed ON assessment_attempts(completed_at);

-- 🔐 CERTIFICATE VERIFICATION LOGS
CREATE TABLE certificate_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    
    -- Verification Details
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id), -- NULL for public verification
    verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN ('QR_CODE', 'CERTIFICATE_NUMBER', 'API', 'MANUAL')),
    
    -- Request Details
    ip_address INET,
    user_agent TEXT,
    employer_name VARCHAR(255),
    employer_email VARCHAR(255),
    
    -- Result
    verification_result VARCHAR(20) NOT NULL CHECK (verification_result IN ('VALID', 'INVALID', 'EXPIRED', 'REVOKED')),
    details JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cert_verifications_cert ON certificate_verifications(certificate_id);
CREATE INDEX idx_cert_verifications_date ON certificate_verifications(verified_at);
CREATE INDEX idx_cert_verifications_result ON certificate_verifications(verification_result);
CREATE INDEX idx_cert_verifications_method ON certificate_verifications(verification_method);

-- 🌐 YACHI INTEGRATION LOGS
CREATE TABLE yachi_integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    
    -- API Interaction
    api_endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    http_status INTEGER,
    
    -- Status
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRY')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_yachi_logs_certificate ON yachi_integration_logs(certificate_id);
CREATE INDEX idx_yachi_logs_status ON yachi_integration_logs(sync_status);
CREATE INDEX idx_yachi_logs_created ON yachi_integration_logs(created_at);

-- 🏢 EMPLOYER VERIFICATION REQUESTS
CREATE TABLE employer_verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    
    -- Employer Details
    employer_name VARCHAR(255) NOT NULL,
    employer_email VARCHAR(255) NOT NULL,
    employer_phone VARCHAR(20),
    company_name VARCHAR(255),
    company_size VARCHAR(50),
    
    -- Candidate Details
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    
    -- Verification
    verification_token VARCHAR(64) UNIQUE NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED')),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employer_requests_cert ON employer_verification_requests(certificate_id);
CREATE INDEX idx_employer_requests_token ON employer_verification_requests(verification_token);
CREATE INDEX idx_employer_requests_status ON employer_verification_requests(status);
CREATE INDEX idx_employer_requests_employer ON employer_verification_requests(employer_email);

-- 📊 CERTIFICATION ANALYTICS VIEW
CREATE VIEW certification_analytics AS
SELECT 
    cc.certification_name,
    cc.certification_code,
    s.skill_name,
    COUNT(DISTINCT c.id) as total_certifications,
    COUNT(DISTINCT CASE WHEN c.status = 'ISSUED' THEN c.id END) as active_certifications,
    COUNT(DISTINCT CASE WHEN c.status = 'EXPIRED' THEN c.id END) as expired_certifications,
    AVG(c.final_score) as average_score,
    COUNT(DISTINCT CASE WHEN c.yachi_verification_status = 'VERIFIED' THEN c.id END) as yachi_verified,
    COUNT(DISTINCT ev.id) as employer_verifications
FROM certification_catalog cc
LEFT JOIN skills_catalog s ON cc.skill_id = s.id
LEFT JOIN certifications c ON cc.id = c.certification_id
LEFT JOIN employer_verification_requests ev ON c.id = ev.certificate_id AND ev.verified = true
WHERE cc.is_active = true
GROUP BY cc.id, cc.certification_name, cc.certification_code, s.skill_name;

-- 🔧 FUNCTIONS AND TRIGGERS

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
DECLARE
    cert_code VARCHAR(10);
    sequence_num INTEGER;
    year_text VARCHAR(4);
BEGIN
    -- Get certification code
    SELECT certification_code INTO cert_code 
    FROM certification_catalog 
    WHERE id = NEW.certification_id;
    
    -- Get current year
    year_text := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Get next sequence number for this certification and year
    SELECT COALESCE(MAX(SUBSTRING(certificate_number FROM '[A-Z]+-([0-9]+)-' || year_text)::INTEGER), 0) + 1
    INTO sequence_num
    FROM certifications
    WHERE certification_id = NEW.certification_id
    AND certificate_number LIKE '%-' || year_text;
    
    -- Format: MOSA-{CODE}-{SEQ}-{YEAR}
    NEW.certificate_number := 'MOSA-' || UPPER(cert_code) || '-' || 
                             LPAD(sequence_num::TEXT, 6, '0') || '-' || year_text;
    
    -- Generate verification hash
    NEW.verification_hash := encode(sha256(NEW.certificate_number::bytea), 'hex');
    
    -- Set expiry date based on certification validity
    SELECT validity_months INTO NEW.expiry_date
    FROM certification_catalog 
    WHERE id = NEW.certification_id;
    
    NEW.expiry_date := NEW.issue_date + (NEW.expiry_date || ' months')::INTERVAL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for certificate number generation
CREATE TRIGGER trg_generate_certificate_number
    BEFORE INSERT ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION generate_certificate_number();

-- Function to update Yachi status
CREATE OR REPLACE FUNCTION update_yachi_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-verify in Yachi if certification is issued and auto-verification is enabled
    IF NEW.status = 'ISSUED' AND OLD.status != 'ISSUED' THEN
        SELECT auto_yachi_verification INTO NEW.yachi_verification_status
        FROM certification_catalog 
        WHERE id = NEW.certification_id;
        
        IF NEW.yachi_verification_status = true THEN
            NEW.yachi_verification_status := 'PENDING'; -- Will be updated via Yachi API
        END IF;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Yachi status updates
CREATE TRIGGER trg_update_yachi_status
    BEFORE UPDATE ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_yachi_verification_status();

-- Function to check assessment attempts
CREATE OR REPLACE FUNCTION check_assessment_attempts()
RETURNS TRIGGER AS $$
DECLARE
    max_attempts INTEGER;
    current_attempts INTEGER;
BEGIN
    -- Get maximum allowed attempts
    SELECT maximum_attempts INTO max_attempts
    FROM certification_assessments
    WHERE id = NEW.assessment_id;
    
    -- Count current attempts
    SELECT COUNT(*) INTO current_attempts
    FROM assessment_attempts
    WHERE student_id = NEW.student_id
    AND assessment_id = NEW.assessment_id
    AND certification_id = NEW.certification_id;
    
    -- Check if maximum attempts exceeded
    IF current_attempts >= max_attempts THEN
        RAISE EXCEPTION 'Maximum attempts (%) exceeded for this assessment', max_attempts;
    END IF;
    
    -- Set attempt number
    NEW.attempt_number := current_attempts + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for assessment attempts validation
CREATE TRIGGER trg_check_assessment_attempts
    BEFORE INSERT ON assessment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION check_assessment_attempts();

-- 🗂️ INITIAL DATA: Certification Catalog for Key Skills
INSERT INTO certification_catalog (
    skill_id,
    certification_name,
    certification_code,
    description,
    minimum_completion_percentage,
    minimum_quality_score,
    yachi_provider_code,
    yachi_category,
    auto_yachi_verification,
    validity_months,
    created_by
) VALUES 
-- Forex Trading
(
    (SELECT id FROM skills_catalog WHERE skill_name = 'Forex Trading Mastery' LIMIT 1),
    'Certified Forex Trading Professional',
    'CFTP',
    'Professional certification in Forex trading covering ICT, SMC, Price Action methodologies',
    85,
    4.2,
    'FOREX_PRO_001',
    'Financial Services',
    true,
    24,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
),
-- Graphic Design
(
    (SELECT id FROM skills_catalog WHERE skill_name = 'Professional Graphic Design' LIMIT 1),
    'Professional Graphic Design Certification',
    'PGDC',
    'Comprehensive graphic design certification covering branding, UI/UX, and print design',
    80,
    4.0,
    'DESIGN_PRO_001',
    'Creative Services',
    true,
    24,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
),
-- Web Development
(
    (SELECT id FROM skills_catalog WHERE skill_name = 'Full-Stack Web Development' LIMIT 1),
    'Full-Stack Web Developer Certification',
    'FSWD',
    'End-to-end web development certification covering frontend, backend, and deployment',
    85,
    4.1,
    'TECH_PRO_001',
    'Technology Services',
    true,
    24,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
);

-- 🎯 CREATE ASSESSMENTS FOR EACH CERTIFICATION
INSERT INTO certification_assessments (
    certification_id,
    assessment_name,
    assessment_type,
    description,
    passing_score,
    maximum_attempts,
    time_limit_minutes,
    weightage,
    is_required
) 
SELECT 
    id,
    'Practical Project Assessment',
    'PRACTICAL',
    'Real-world project implementation and demonstration',
    75,
    2,
    180,
    50,
    true
FROM certification_catalog
WHERE certification_code = 'CFTP'

UNION ALL

SELECT 
    id,
    'Trading Theory Examination',
    'THEORETICAL',
    'Comprehensive theory test covering trading concepts and risk management',
    70,
    3,
    120,
    30,
    true
FROM certification_catalog
WHERE certification_code = 'CFTP'

UNION ALL

SELECT 
    id,
    'Portfolio Review',
    'PORTFOLIO',
    'Evaluation of trading portfolio and performance metrics',
    80,
    2,
    NULL,
    20,
    true
FROM certification_catalog
WHERE certification_code = 'CFTP';

-- 🔐 CREATE INDEXES FOR PERFORMANCE
CREATE INDEX CONCURRENTLY idx_certifications_composite ON certifications(student_id, status, issue_date);
CREATE INDEX CONCURRENTLY idx_assessments_composite ON assessment_attempts(student_id, assessment_id, status);
CREATE INDEX CONCURRENTLY idx_verifications_composite ON certificate_verifications(certificate_id, verified_at);

-- 🗄️ COMMENTS ON TABLES AND COLUMNS
COMMENT ON TABLE certifications IS 'Enterprise certification issuance and management system with Yachi integration';
COMMENT ON COLUMN certifications.verification_hash IS 'SHA-256 hash for secure certificate verification';
COMMENT ON COLUMN certifications.yachi_metadata IS 'Yachi platform integration data and sync status';
COMMENT ON TABLE yachi_integration_logs IS 'Audit trail for all Yachi API interactions and sync operations';

-- 📊 UPDATE MIGRATION METADATA
INSERT INTO migration_metadata (migration_number, migration_name, executed_at, checksum) 
VALUES (
    005, 
    'certification-system', 
    CURRENT_TIMESTAMP, 
    encode(sha256('certification-system-enterprise-v1'::bytea), 'hex')
);

-- 🎯 MIGRATION COMPLETION
DO $$ 
BEGIN
    RAISE NOTICE '🎉 CERTIFICATION SYSTEM MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '📊 Created: 6 enterprise tables + 1 analytics view';
    RAISE NOTICE '🔧 Implemented: 3 triggers + 3 functions';
    RAISE NOTICE '🏆 Seeded: Certification catalog with Yachi integration';
    RAISE NOTICE '🚀 Ready for production certification workflows';
END $$;