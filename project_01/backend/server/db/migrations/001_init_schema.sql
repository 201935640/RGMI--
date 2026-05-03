CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    description VARCHAR(200) DEFAULT '',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) DEFAULT '',
    avatar_url VARCHAR(500) DEFAULT '',
    role_id INT NOT NULL,
    status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    last_login_at DATETIME(6) NULL,
    last_login_ip VARCHAR(45) NULL,
    login_fail_count INT DEFAULT 0,
    locked_until DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX ix_users_role_id ON users(role_id);
CREATE INDEX ix_users_created_at ON users(created_at);
CREATE INDEX ix_users_is_deleted_status ON users(is_deleted, status);
CREATE INDEX ix_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME(6) NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX ix_prt_user_used ON password_reset_tokens(user_id, used);

CREATE TABLE IF NOT EXISTS login_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    success TINYINT(1) NOT NULL DEFAULT 1,
    fail_reason VARCHAR(200) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX ix_login_logs_user_created ON login_logs(user_id, created_at);
CREATE INDEX ix_login_logs_created_at ON login_logs(created_at);

CREATE TABLE IF NOT EXISTS search_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    disease_id VARCHAR(20) NOT NULL,
    disease_name VARCHAR(200) DEFAULT '',
    operation_type ENUM('login', 'logout', 'search', 'query', 'export', 'view') NOT NULL DEFAULT 'search',
    detail TEXT NULL,
    top_n INT DEFAULT 20,
    ip_address VARCHAR(45) NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    searched_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX ix_sh_user_searched ON search_histories(user_id, searched_at);
CREATE INDEX ix_sh_user_disease ON search_histories(user_id, disease_id);
CREATE INDEX ix_sh_disease_id ON search_histories(disease_id);
CREATE INDEX ix_sh_operation_type ON search_histories(operation_type);
CREATE INDEX ix_sh_user_not_deleted ON search_histories(user_id, is_deleted, searched_at);
