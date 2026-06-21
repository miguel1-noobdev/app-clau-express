const express = require('express');
const { body, param } = require('express-validator');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { protectAdminAccount } = require('../middleware/admin-protection.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();
router.use(isAuthenticated, isAdmin);

const usernameValidation = body('username')
  .trim().notEmpty().withMessage('El usuario es requerido')
  .isLength({ min: 3, max: 30 }).withMessage('El usuario debe tener entre 3 y 30 caracteres')
  .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guiones bajos');

const passwordValidation = body('password')
  .notEmpty().withMessage('La contraseña es requerida')
  .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
  .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula')
  .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número');

const roleValidation = body('role')
  .notEmpty().withMessage('El rol es requerido')
  .isIn(['user', 'admin', 'supervisor']).withMessage('Rol inválido');

const idParam = param('id').isMongoId().withMessage('ID de usuario inválido');

// Users
router.get('/users', adminController.getUsers);
router.post('/users', usernameValidation, passwordValidation, roleValidation,
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
  body('phone').optional({ checkFalsy: true }).isString().withMessage('Teléfono inválido'),
  validate, adminController.createUser);
router.put('/users/:id', protectAdminAccount, idParam,
  body('username').optional().trim().notEmpty().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('role').optional().isIn(['user', 'admin', 'supervisor']),
  body('password').optional().notEmpty().isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  validate, adminController.updateUser);
router.delete('/users/:id', protectAdminAccount, idParam, validate, adminController.deleteUser);
router.put('/users/:id/toggle-status', protectAdminAccount, adminController.toggleUserStatus);
router.put('/users/:id/role', protectAdminAccount, idParam, roleValidation, validate, adminController.changeUserRole);
router.put('/users/:id/reset-password', protectAdminAccount, adminController.resetPassword);
router.get('/users/:id/records', idParam, validate, adminController.getUserRecords);

// Records
router.put('/records/:id/admin-edit', adminController.editRecord);
router.delete('/records/:id/admin-delete', adminController.deleteRecord);

// Logs
router.get('/logs/access', adminController.getAccessLogs);
router.get('/logs/modifications', adminController.getModificationLogs);

module.exports = router;
