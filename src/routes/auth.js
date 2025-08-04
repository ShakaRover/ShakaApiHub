const express = require('express');
const AuthController = require('../controllers/AuthController');
const authMiddleware = require('../middleware/auth');
const validationMiddleware = require('../middleware/validation');

const router = express.Router();
const authController = new AuthController();

router.post('/login', 
    validationMiddleware.validateLogin, 
    (req, res) => authController.login(req, res)
);

router.post('/logout', 
    authMiddleware, 
    (req, res) => authController.logout(req, res)
);

router.post('/update-password', 
    authMiddleware,
    validationMiddleware.validatePasswordUpdate,
    (req, res) => authController.updatePassword(req, res)
);

router.post('/update-username', 
    authMiddleware,
    validationMiddleware.validateUsernameUpdate,
    (req, res) => authController.updateUsername(req, res)
);

router.get('/profile', 
    authMiddleware, 
    (req, res) => authController.getProfile(req, res)
);

module.exports = router;