DROP TABLE users CASCADE;
DROP TABLE groups CASCADE;
DROP TABLE users_to_groups CASCADE;
DROP TABLE expenses CASCADE;
DROP TABLE expenses_to_groups CASCADE;
DROP TABLE friends CASCADE;

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
  group_name VARCHAR(100),
  payee INTEGER NOT NULL, 
  amount DECIMAL NOT NULL,
  FOREIGN KEY (payee) REFERENCES users (user_id) ON DELETE CASCADE,
  payment_day VARCHAR(100),
  payment_time VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS users_to_groups (
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups (group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  trans_id SERIAL PRIMARY KEY NOT NULL,
  amount DECIMAL,
  payer INTEGER NOT NULL,
  payee INTEGER NOT NULL,
  FOREIGN KEY (payee) REFERENCES users (user_id) ON DELETE CASCADE, 
  FOREIGN KEY (payer) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses_to_groups (
  trans_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  FOREIGN KEY (group_id) REFERENCES groups (group_id) ON DELETE CASCADE,
  FOREIGN KEY (trans_id) REFERENCES expenses (trans_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users (user_id) ON DELETE CASCADE
);