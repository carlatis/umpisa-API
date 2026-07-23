-- Run this script in MySQL Workbench while connected as root or another administrator.
CREATE DATABASE IF NOT EXISTS `umpisa`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY '1234';
ALTER USER 'admin'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON `umpisa`.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;

USE `umpisa`;
