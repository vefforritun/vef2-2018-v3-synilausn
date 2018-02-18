const { Client } = require('pg');
const validator = require('validator');
const xss = require('xss');

const connectionString = process.env.DATABASE_URL;

/* hjálparföll */

/**
 * Validate a note.
 *
 * @param {Object} note - Note to validate
 * @param {string} note.title - Title of note, must be of length [1, 255]
 * @param {string} note.text - Text of note, any string
 * @param {string} note.datetime - Datetime of note, must be a valid ISO 8601 string
 *
 * @returns {array} Array of validation of errors, empty error if no errors
 */
function validateNote({ title, text, datetime }) {
  const errors = [];

  if (typeof title !== 'string' || !validator.isLength(title, { min: 1, max: 255 })) {
    errors.push({
      field: 'title',
      message: 'Title must be a string of length 1 to 255 characters',
    });
  }

  if (typeof text !== 'string') {
    errors.push({
      field: 'text',
      message: 'Text must be a string',
    });
  }

  if (typeof datetime !== 'string' || !validator.isISO8601(datetime)) {
    errors.push({
      field: 'datetime',
      message: 'Datetime must be a ISO 8601 date',
    });
  }

  return errors;
}

/**
 * Execute an SQL query.
 *
 * @param {string} sqlQuery - SQL query to execute
 * @param {array} [values=[]] - Values for parameterized query
 *
 * @returns {Promise} Promise representing the result of the SQL query
 */
async function query(sqlQuery, values = []) {
  const client = new Client({ connectionString });
  await client.connect();

  let result;

  try {
    result = await client.query(sqlQuery, values);
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    await client.end();
  }

  return result;
}

/* api */

/**
 * Create a note asynchronously.
 *
 * @param {Object} note - Note to create
 * @param {string} note.title - Title of note
 * @param {string} note.text - Text of note
 * @param {string} note.datetime - Datetime of note
 *
 * @returns {Promise} Promise representing the object result of creating the note
 */
async function create({ title, text, datetime } = {}) {
  const validation = validateNote({ title, text, datetime });

  if (validation.length > 0) {
    return {
      success: false,
      validation,
      item: null,
    };
  }

  const cleanTitle = xss(title);
  const cleanText = xss(text);
  const cleanDatetime = xss(datetime);

  const sqlQuery = 'INSERT INTO notes(title, text, datetime) VALUES($1, $2, $3) RETURNING *';
  const values = [cleanTitle, cleanText, cleanDatetime];

  const result = await query(sqlQuery, values);

  return {
    success: true,
    validation: [],
    item: result.rows[0],
  };
}

/**
 * Read all notes.
 *
 * @returns {Promise} Promise representing an array of all note objects
 */
async function readAll() {
  const sqlQuery = 'SELECT id, title, text, datetime FROM notes';

  const result = await query(sqlQuery);

  return result.rows;
}

/**
 * Read a single note.
 *
 * @param {number} id - Id of note
 *
 * @returns {Promise} Promise representing the note object or null if not found
 */
async function readOne(id) {
  const sqlQuery = 'SELECT id, title, text, datetime FROM notes WHERE id = $1';

  const result = await query(sqlQuery, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update a note asynchronously.
 *
 * @param {number} id - Id of note to update
 * @param {Object} note - Note to create
 * @param {string} note.title - Title of note
 * @param {string} note.text - Text of note
 * @param {string} note.datetime - Datetime of note
 *
 * @returns {Promise} Promise representing the object result of creating the note
 */
async function update(id, { title, text, datetime } = {}) {
  const validation = validateNote({ title, text, datetime });

  if (validation.length > 0) {
    return {
      success: false,
      validation,
    };
  }

  const cleanTitle = xss(title);
  const cleanText = xss(text);
  const cleanDatetime = xss(datetime);

  const sqlQuery = 'UPDATE notes SET title = $1, text = $2, datetime = $3 WHERE id = $4 RETURNING *';
  const values = [cleanTitle, cleanText, cleanDatetime, id];

  const result = await query(sqlQuery, values);

  if (result.rowCount === 0) {
    return {
      success: false,
      validation: [],
      notFound: true,
    };
  }

  return {
    success: true,
    validation: [],
    item: result.rows[0],
  };
}

/**
 * Delete a note asynchronously.
 *
 * @param {number} id - Id of note to delete
 *
 * @returns {Promise} Promise representing the boolean result of creating the note
 */
async function del(id) {
  const sqlQuery = 'DELETE FROM notes WHERE id = $1';

  const result = await query(sqlQuery, [id]);

  return result.rowCount === 1;
}

module.exports = {
  create,
  readAll,
  readOne,
  update,
  del,
};
