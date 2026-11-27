
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');

const router = express.Router();

const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof displayName !== 'string' ||
      !email.trim() ||
      !password ||
      !displayName.trim()
    ) {
      return res.status(400).json({
        message: 'Заполните email, password и displayName'
      });
    }

    const normalizedEmail = email.trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Пользователь с таким email уже существует'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName.trim()
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      message: 'Регистрация прошла успешно',
      user
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Пользователь с таким email уже существует'
      });
    }

    console.error('Ошибка регистрации:', error);

    return res.status(500).json({
      message: 'Ошибка сервера при регистрации'
    });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Введите email и пароль'
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email.trim()
      }
    });

    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: 'Неверный email или пароль'
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);

    return res.status(500).json({
      message: 'Ошибка сервера при входе'
    });
  }
});


router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден'
      });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);

    return res.status(500).json({
      message: 'Ошибка сервера'
    });
  }
});

module.exports = router;
