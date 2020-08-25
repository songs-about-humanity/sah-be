const { Router } = require('express');

module.exports = Router()
  .post('/', (req, res, next) => {

  })

  .get('/:id', (req, res, next) => {
    User
      .findById(req.params.id)
      .then(user => res.send(user))
      .catch(next);
  });
