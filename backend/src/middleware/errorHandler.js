const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
