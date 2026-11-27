
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');

const router = express.Router();

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

module.exports = router;
