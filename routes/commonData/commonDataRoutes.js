const { Router } = require('express');

const CommonDataRoutes = Router();

const CommonDataController = require('../../controllers/CommonData/CommonDataController');
const commonDataController = new CommonDataController();


CommonDataRoutes.post(`/getData`, commonDataController.getData);



module.exports = CommonDataRoutes;