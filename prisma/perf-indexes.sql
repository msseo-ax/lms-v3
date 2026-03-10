CREATE INDEX CONCURRENTLY IF NOT EXISTS users_division_id_idx ON users (division_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_team_id_idx ON users (team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS contents_category_id_idx ON contents (category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS contents_created_at_idx ON contents (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS content_files_content_id_idx ON content_files (content_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS content_targets_content_id_idx ON content_targets (content_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS content_targets_target_type_target_id_idx ON content_targets (target_type, target_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS read_logs_content_id_idx ON read_logs (content_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS file_access_logs_content_file_id_idx ON file_access_logs (content_file_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS file_access_logs_user_id_idx ON file_access_logs (user_id);
