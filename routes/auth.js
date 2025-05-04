const router = require('express').Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone_number, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users(name,email,phone_number,password_hash)
     VALUES($1,$2,$3,$4) RETURNING id,name,email,phone_number`,
    [name, email, phone_number, hash]
  );
  const user = rows[0];

  // assign default 'customer' role
  const { rows: roleRows } = await db.query(
    `SELECT id FROM roles WHERE name='customer'`
  );
  if (roleRows[0]) {
    await db.query(
      `INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)`,
      [user.id, roleRows[0].id]
    );
  }

  // fetch roles
  const { rows: userRoles } = await db.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [user.id]
  );

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      roles: userRoles.map(r => r.name)
    },
    token
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // fetch roles
  const { rows: userRoles } = await db.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id=r.id
     WHERE ur.user_id=$1`,
    [user.id]
  );

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      roles: userRoles.map(r => r.name)
    },
    token
  });
});

module.exports = router;
