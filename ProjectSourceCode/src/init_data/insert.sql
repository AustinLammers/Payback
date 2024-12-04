INSERT INTO users (user_id, name, password, username, email, account_bal) 
VALUES
   (1, 'George Clooney',  '$2a$12$dYDLvCzEczAlwSM6aP4oROElY8tt8nKpNzmNCkprnPb2eYbU1Dk5y', 'GC1', 'gc@email.com', 101.6),  -- Password is 1
   (2, 'Matt Damon',  '$2a$12$/UxhfdnRe8/pAnmJK23gxOS2nNiCAcOeYmSbcr8aHkZz5OlShbgSW', 'MD2', 'md@email.com', 108.6) returning * ; -- Password is 2

-- INSERT INTO groups (group_id, group_name) 
-- VALUES
--    (1, 'Oceans') returning * ;

-- INSERT INTO users_to_groups (group_id, user_id) 
-- VALUES
--    (1, 1) returning * ;