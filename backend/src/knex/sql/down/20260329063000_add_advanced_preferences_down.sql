ALTER TABLE revision.user_preferences 
DROP COLUMN IF EXISTS line_height,
DROP COLUMN IF EXISTS primary_color_light,
DROP COLUMN IF EXISTS primary_color_dark;
