const { Router } = require('express');
const User = require('../models/User');

module.exports = Router()
  .post('/', (req, res, next) => {
    User
      .create(req.body)
      .then(owner => res.send(owner))
      .catch(next);
  })

  .get('/:id', (req, res, next) => {
    User
      .findById(req.params.id)
      .then(user => res.send(user))
      .catch(next);
  });
