const express = require('express');
const dropsController = require('../controllers/drops');

const router = express.Router();

router.get('/', dropsController.list);
router.post('/', dropsController.create);

module.exports = router;
