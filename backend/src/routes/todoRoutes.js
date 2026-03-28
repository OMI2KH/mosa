import { Router } from 'express';
import { createTodo, getTodos, completeTodo } from '../controllers/todoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// ✅ Create a new todo
router.post('/', authMiddleware, createTodo);

// ✅ Get all todos for the user
router.get('/', authMiddleware, getTodos);

// ✅ Mark a todo as complete
router.post('/:id/complete', authMiddleware, completeTodo);

export default router;

