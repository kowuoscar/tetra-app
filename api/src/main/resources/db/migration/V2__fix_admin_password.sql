-- Fix admin seed user password hash (Admin1234!)
-- V1 contained a placeholder hash that did not match the intended password.
UPDATE users
SET password_hash = '$2y$12$qmCGZGYl5gtRUHj2YsjDyO4KS/touvjHS6kJL1Rk4x6aHNIdUGopO'
WHERE email = 'admin@tetramobile.ae';
