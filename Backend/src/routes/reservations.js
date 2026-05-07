const express = require('express');
const reservationsController = require('../controllers/reservations');

const router = express.Router();

router.post('/', reservationsController.create);

module.exports = router;
