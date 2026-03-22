ALTER TABLE likes
ADD CONSTRAINT fk_likes_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE;