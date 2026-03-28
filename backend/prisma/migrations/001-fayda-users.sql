-- migrations/001-fayda-users.sql

/**
 * 🎯 ENTERPRISE USER AUTHENTICATION MIGRATION
 * Production-ready Fayda ID user management system
 * Features: Government ID verification, security, scalability, compliance
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

-- Enable UUID extension for secure ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions for security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 🏢 ENTERPRISE USERS TABLE
CREATE TABLE users (
    -- 🆔 CORE IDENTIFICATION
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 🇪🇹 GOVERNMENT FAYDA ID VERIFICATION
    fayda_id VARCHAR(30) UNIQUE NOT NULL,
    fayda_verified BOOLEAN DEFAULT FALSE,
    fayda_verification_status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (fayda_verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    fayda_verified_at TIMESTAMPTZ,
    fayda_metadata JSONB, -- Store government API response
    
    -- 🔐 SECURE AUTHENTICATION
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- 🛡️ PASSWORD SECURITY (Argon2 hashed)
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 👤 PERSONAL INFORMATION
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    
    -- 📍 LOCATION DATA
    region VARCHAR(100),
    zone VARCHAR(100),
    woreda VARCHAR(100),
    kebele VARCHAR(100),
    city VARCHAR(100),
    specific_location TEXT,
    gps_coordinates POINT,
    
    -- 🎯 PLATFORM ROLE MANAGEMENT
    user_type VARCHAR(20) NOT NULL DEFAULT 'STUDENT' 
        CHECK (user_type IN ('STUDENT', 'EXPERT', 'ADMIN', 'SUPPORT', 'QUALITY_MANAGER')),
    
    -- 📱 DEVICE & SECURITY
    device_info JSONB, -- Store device fingerprint
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    current_login_ip INET,
    
    -- 🔒 SECURITY & COMPLIANCE
    login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    backup_codes TEXT[], -- Encrypted backup codes
    
    -- 📊 PLATFORM METRICS
    total_sessions INTEGER DEFAULT 0,
    completed_courses INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- 🏷️ ACCOUNT STATUS
    status VARCHAR(20) DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED', 'UNDER_REVIEW')),
    suspension_reason TEXT,
    
    -- ⚠️ DUPLICATE PREVENTION
    duplicate_flag BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES users(id),
    ai_duplicate_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- 📝 COMPLIANCE & CONSENT
    terms_accepted BOOLEAN DEFAULT FALSE,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    data_processing_consent BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    consent_versions JSONB, -- Track consent version history
    
    -- 🕒 ENTERPRISE AUDIT TRAIL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by UUID REFERENCES users(id), -- Admin who verified
    deleted_at TIMESTAMPTZ,
    
    -- 🔍 PERFORMANCE INDEXES
    CONSTRAINT valid_fayda_format CHECK (fayda_id ~ '^[A-Z0-9]{1,30}$'),
    CONSTRAINT valid_phone_format CHECK (phone_number ~ '^\+251[0-9]{9}$'),
    CONSTRAINT age_requirement CHECK (
        date_of_birth <= CURRENT_DATE - INTERVAL '16 years' OR 
        (user_type = 'STUDENT' AND date_of_birth <= CURRENT_DATE - INTERVAL '15 years')
    )
);

-- 🏃‍♂️ USER PROFILES TABLE (Separate for performance)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎓 EDUCATIONAL BACKGROUND
    education_level VARCHAR(50),
    field_of_study VARCHAR(100),
    institution VARCHAR(200),
    graduation_year INTEGER,
    
    -- 💼 PROFESSIONAL INFORMATION
    occupation VARCHAR(100),
    experience_years INTEGER DEFAULT 0,
    current_employer VARCHAR(200),
    skills TEXT[], -- Array of skills
    
    -- 🎯 PLATFORM PREFERENCES
    preferred_language VARCHAR(10) DEFAULT 'am',
    notification_preferences JSONB DEFAULT '{
        "sms": true,
        "email": false,
        "push": true,
        "marketing": false
    }',
    learning_goals TEXT,
    
    -- 📊 BEHAVIORAL METRICS
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    response_time_minutes INTEGER, -- Average response time
    
    -- 🖼️ PROFILE MEDIA
    profile_picture_url TEXT,
    cover_photo_url TEXT,
    portfolio_links JSONB,
    
    -- 📝 BIO & DESCRIPTION
    bio TEXT,
    tagline VARCHAR(200),
    
    -- 🕒 AUDIT TRAIL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 🔍 INDEXES
    CONSTRAINT valid_rating CHECK (average_rating >= 0 AND average_rating <= 5)
);

-- 🔐 PASSWORD HISTORY TABLE (Security compliance)
CREATE TABLE password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES users(id), -- For admin resets
    
    -- 🔍 INDEXES
    CONSTRAINT unique_password_per_user UNIQUE (user_id, password_hash)
);

-- 📲 OTP VERIFICATION SYSTEM
CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🔢 OTP DETAILS
    otp_code VARCHAR(8) NOT NULL, -- 6-8 digit OTP
    otp_type VARCHAR(20) NOT NULL 
        CHECK (otp_type IN ('PHONE_VERIFICATION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_2FA')),
    
    -- 📱 DELIVERY INFORMATION
    delivery_method VARCHAR(10) NOT NULL CHECK (delivery_method IN ('SMS', 'EMAIL', 'WHATSAPP')),
    recipient VARCHAR(255) NOT NULL, -- Phone or email
    message_id TEXT, -- Provider message ID
    
    -- ⏱️ VALIDITY & USAGE
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    verification_attempts INTEGER DEFAULT 0,
    
    -- 🔒 SECURITY
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint TEXT,
    
    -- 📊 STATUS
    status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED')),
    
    -- 🕒 TIMESTAMPS
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 🔍 INDEXES
    CONSTRAINT otp_expiry_check CHECK (expires_at > created_at)
);

-- 🚨 SECURITY EVENTS LOG
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 🎯 EVENT DETAILS
    event_type VARCHAR(50) NOT NULL 
        CHECK (event_type IN (
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PROFILE_UPDATE',
            'FAYDA_VERIFICATION', 'PHONE_VERIFICATION', 'EMAIL_VERIFICATION',
            'SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            'MFA_ENABLED', 'MFA_DISABLED', 'BACKUP_CODE_USED'
        )),
    event_severity VARCHAR(10) DEFAULT 'INFO' 
        CHECK (event_severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- 📝 EVENT DATA
    description TEXT NOT NULL,
    metadata JSONB, -- Additional event data
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- 🕒 TIMESTAMP
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔄 USER SESSIONS MANAGEMENT
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎫 SESSION TOKENS
    access_token_hash TEXT NOT NULL, -- Hashed JWT access token
    refresh_token_hash TEXT NOT NULL, -- Hashed refresh token
    device_id VARCHAR(100), -- Unique device identifier
    
    -- 📱 SESSION CONTEXT
    ip_address INET NOT NULL,
    user_agent TEXT,
    location JSONB, -- Geographic data
    device_type VARCHAR(20) CHECK (device_type IN ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN')),
    
    -- ⏱️ SESSION LIFECYCLE
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    
    -- 🔒 SECURITY
    is_compromised BOOLEAN DEFAULT FALSE,
    revocation_reason TEXT,
    
    -- 🔍 INDEXES
    CONSTRAINT session_expiry_check CHECK (expires_at > issued_at)
);

-- 🏢 FAYDA VERIFICATION REQUESTS
CREATE TABLE fayda_verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 📋 REQUEST DATA
    fayda_id VARCHAR(30) NOT NULL,
    request_data JSONB NOT NULL, -- Data sent to government API
    response_data JSONB, -- Response from government API
    
    -- 📊 VERIFICATION STATUS
    status VARCHAR(20) DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'RETRY', 'MANUAL_REVIEW')),
    verification_score DECIMAL(3,2), -- AI duplicate detection score
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    
    -- 👤 VERIFICATION AGENT
    verified_by UUID REFERENCES users(id), -- Admin who manually verified
    verification_notes TEXT,
    
    -- ⏱️ TIMESTAMPS
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    
    -- 🔍 INDEXES
    CONSTRAINT fayda_format_check CHECK (fayda_id ~ '^[A-Z0-9]{1,30}$')
);

-- 📊 USER ACTIVITY TRACKING
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 🎯 ACTIVITY DETAILS
    activity_type VARCHAR(50) NOT NULL,
    activity_module VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    
    -- 📝 ACTIVITY DATA
    metadata JSONB,
    resource_id UUID, -- Related entity ID
    resource_type VARCHAR(50), -- Related entity type
    
    -- 📱 CONTEXT
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- 🕒 TIMESTAMP
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔍 ENTERPRISE INDEXES FOR PERFORMANCE

-- Users table indexes
CREATE INDEX idx_users_fayda_id ON users(fayda_id);
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_region ON users(region);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_fayda_verified ON users(fayda_verified);
CREATE INDEX idx_users_duplicate_flag ON users(duplicate_flag);

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_education ON user_profiles(education_level);
CREATE INDEX idx_user_profiles_skills ON user_profiles USING GIN(skills);

-- OTP verification indexes
CREATE INDEX idx_otp_user_id ON otp_verifications(user_id);
CREATE INDEX idx_otp_recipient ON otp_verifications(recipient);
CREATE INDEX idx_otp_status ON otp_verifications(status);
CREATE INDEX idx_otp_expires_at ON otp_verifications(expires_at);
CREATE INDEX idx_otp_created_at ON otp_verifications(created_at);

-- Security events indexes
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(event_severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

-- User sessions indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_access_token ON user_sessions(access_token_hash);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_device_id ON user_sessions(device_id);

-- Fayda verification indexes
CREATE INDEX idx_fayda_requests_user_id ON fayda_verification_requests(user_id);
CREATE INDEX idx_fayda_requests_status ON fayda_verification_requests(status);
CREATE INDEX idx_fayda_requests_submitted_at ON fayda_verification_requests(submitted_at);

-- User activities indexes
CREATE INDEX idx_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_activities_type ON user_activities(activity_type);
CREATE INDEX idx_activities_module ON user_activities(activity_module);
CREATE INDEX idx_activities_created_at ON user_activities(created_at);
CREATE INDEX idx_activities_resource ON user_activities(resource_type, resource_id);

-- 🔐 SECURITY POLICIES AND CONSTRAINTS

-- Password history constraint (prevent reuse of last 5 passwords)
CREATE OR REPLACE FUNCTION check_password_history()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM password_history 
        WHERE user_id = NEW.user_id 
        AND password_hash = NEW.password_hash
        ORDER BY changed_at DESC 
        LIMIT 5
    ) THEN
        RAISE EXCEPTION 'Password has been used recently. Please choose a different password.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_password_history
    BEFORE INSERT ON password_history
    FOR EACH ROW
    EXECUTE FUNCTION check_password_history();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_otp_verifications_updated_at BEFORE UPDATE ON otp_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fayda_requests_updated_at BEFORE UPDATE ON fayda_verification_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 🎯 ENTERPRISE DATA RETENTION VIEWS

-- Active users view for reporting
CREATE VIEW active_users AS
SELECT 
    u.id,
    u.fayda_id,
    u.phone_number,
    u.first_name,
    u.last_name,
    u.user_type,
    u.region,
    u.city,
    u.created_at,
    up.average_rating,
    up.total_ratings
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.status = 'ACTIVE' 
AND u.fayda_verified = true;

-- User security overview view
CREATE VIEW user_security_overview AS
SELECT 
    u.id,
    u.fayda_id,
    u.phone_number,
    u.email,
    u.mfa_enabled,
    u.last_login_at,
    u.login_attempts,
    u.account_locked_until,
    COUNT(DISTINCT s.id) as active_sessions,
    COUNT(DISTINCT CASE WHEN se.event_severity IN ('HIGH', 'CRITICAL') THEN se.id END) as security_incidents
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.revoked_at IS NULL AND s.expires_at > NOW()
LEFT JOIN security_events se ON u.id = se.user_id AND se.created_at >= NOW() - INTERVAL '30 days'
WHERE u.status = 'ACTIVE'
GROUP BY u.id;

-- 📊 COMMENT ON TABLES FOR DOCUMENTATION

COMMENT ON TABLE users IS 'Enterprise user authentication system with Fayda ID verification for Mosa Forge platform';
COMMENT ON TABLE user_profiles IS 'Extended user profile information and preferences';
COMMENT ON TABLE password_history IS 'Password history for security compliance and reuse prevention';
COMMENT ON TABLE otp_verifications IS 'OTP-based verification system for phone, email, and 2FA';
COMMENT ON TABLE security_events IS 'Comprehensive security event logging and monitoring';
COMMENT ON TABLE user_sessions IS 'User session management with JWT token tracking';
COMMENT ON TABLE fayda_verification_requests IS 'Fayda ID government verification requests and responses';
COMMENT ON TABLE user_activities IS 'User activity tracking for analytics and behavior monitoring';

-- 🚀 MIGRATION COMPLETION MARKER

-- Insert migration record
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64) -- For verification
);

INSERT INTO schema_migrations (version, description, checksum) 
VALUES (
    '001-fayda-users', 
    'Enterprise user authentication system with Fayda ID verification, security features, and compliance tracking',
    MD5('001-fayda-users-' || NOW()::TEXT)
);

-- 🎉 MIGRATION SUCCESSFUL