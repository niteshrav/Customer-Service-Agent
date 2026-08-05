-- Step 3 helper: create the application database (run once).
-- Connect to the default maintenance DB first, e.g.:
--   psql -h 127.0.0.1 -U YOUR_USER -d postgres -f sql/create_database.sql
--
-- If the database already exists, you will see an error — that is OK.

CREATE DATABASE customer_service_agent;
