const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { sendMessage, getMessages } = require('../controllers/messageController');

router.use(verifyToken);

router.post('/',             sendMessage);
router.get('/:chat_uuid',    getMessages);

module.exports = router;