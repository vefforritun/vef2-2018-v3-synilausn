const express = require('express');

const {
  create,
  readAll,
  readOne,
  update,
  del,
} = require('./notes');

const router = express.Router();

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

async function notesRoute(req, res) {
  const notes = await readAll();

  return res.json(notes);
}

async function createRoute(req, res) {
  const { title, text, datetime } = req.body;

  const result = await create({ title, text, datetime });

  if (!result.success) {
    return res.status(400).json(result.validation);
  }

  return res.status(201).json(result.item);
}

async function noteRoute(req, res) {
  const { id } = req.params;

  const note = await readOne(id);

  if (note) {
    return res.json(note);
  }

  return res.status(404).json({ error: 'Note not found' });
}

async function putRoute(req, res) {
  const { id } = req.params;
  const { title, text, datetime } = req.body;

  const result = await update(id, { title, text, datetime });

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound && result.notFound) {
    return res.status(404).json({ error: 'Note not found' });
  }

  return res.status(201).json(result.item);
}

async function deleteRoute(req, res) {
  const { id } = req.params;

  const result = await del(id);

  if (result) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Note not found' });
}

router.get('/', catchErrors(notesRoute));
router.post('/', catchErrors(createRoute));
router.get('/:id', catchErrors(noteRoute));
router.put('/:id', catchErrors(putRoute));
router.delete('/:id', catchErrors(deleteRoute));

module.exports = router;
