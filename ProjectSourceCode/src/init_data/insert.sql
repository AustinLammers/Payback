INSERT INTO users (user_id, name, password, username, email, account_bal) 
VALUES
   (1, 'George Clooney',  '1', 'GC1', 'gc@email.com', 101.6) returning *,
   (2, 'Matt Damon',  '2', 'MD2', 'md@email.com', 108.6) returning * ;

INSERT INTO groups (group_id, group_name) 
VALUES
   (1, 'Oceans') returning * ;

INSERT INTO users_to_groups (group_id, user_id) 
VALUES
   (1, 1) returning * ;