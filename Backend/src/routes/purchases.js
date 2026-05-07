const express = require('express');
const purchasesController = require('../controllers/purchases');

const router = express.Router();

router.post('/', purchasesController.create);

module.exports = router;
