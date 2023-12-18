const { Router } = require('express');
const authRoutes = Router();

const AuthController = require('../../controllers/auth/authController');
const authController = new AuthController();

// const multer = require('multer');
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });
// const { configureMulterMiddleware } = require('../../config/uploads');

//* Login da fábrica
const route = '/login';
const routeForgotPassword = '/esqueceuSenha';
authRoutes.post(`${route}`, authController.login);
authRoutes.post(`${route}/saveDataLogMultiUnit`, authController.saveDataLogMultiUnit);
authRoutes.get(`${route}`, authController.getAvailableRoutes);
authRoutes.post(`${routeForgotPassword}`, authController.forgotPassword);
authRoutes.post(`${routeForgotPassword}/validation`, authController.routeForgotEmailValidation);
authRoutes.post(`${routeForgotPassword}/newPassword`, authController.routeForgotNewPassword);

//* TESTE FOTOS
// authRoutes.post(`${route}/testeFoto`, authController.testeFoto);
// authRoutes.post(`${route}/enviaFoto`, authController.enviaFoto);
// authRoutes.post(`${route}/enviaFoto`, upload.array('files[]'), (req, res) => {
//     const fotos = req.files; // O arquivo estará disponível em req.file
//     console.log("🚀 ~ route:", fotos);

// }, authController.enviaFoto);

// authRoutes.post(`${route}/enviaFoto`, (req, res, next) => {
//     console.log('route: ', req.files)
//     const pathDestination = `uploads/0/fornecedor/teste/`
//     configureMulterMiddleware(req, res, next, 1, 1, pathDestination)
// }, authController.enviaFoto);

module.exports = authRoutes;