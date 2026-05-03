INSERT INTO roles (name, display_name, description)
VALUES
('admin', '系统管理员', '拥有全部权限'),
('researcher', '高级研究员', '可进行高级数据分析'),
('user', '数据分析师', '标准用户权限'),
('guest', '临时访客', '受限浏览权限')
ON DUPLICATE KEY UPDATE
display_name = VALUES(display_name),
description = VALUES(description);
