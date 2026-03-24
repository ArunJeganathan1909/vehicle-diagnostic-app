const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { getChats, createChat, getChatById, deleteChat, resolveChat } = require('../controllers/chatController');

router.use(verifyToken);

router.get('/',            getChats);
router.post('/',           createChat);
router.get('/:uuid',       getChatById);
router.delete('/:uuid',    deleteChat);
router.patch('/:uuid/resolve', resolveChat);

module.exports = router;