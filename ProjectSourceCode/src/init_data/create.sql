CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(100),
  password VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  account_bal DECIMAL
);

CREATE TABLE IF NOT EXISTS groups (
  group_id SERIAL PRIMARY KEY NOT NULL,
  group_name VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS users_to_groups (
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups (group_id) ON DELETE CASCADE
);