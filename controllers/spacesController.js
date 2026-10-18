import * as spacesService from '../services/spacesService.js';

export async function index(req, res) {
  const spaces = await spacesService.listSpaces();

  return res.status(200).render('spaces', {
    title: 'Study Spaces',
    spaces,
  });
}

export async function create(req, res) {
  const result = await spacesService.createSpace(req.body);

  if (!result.ok) {
    return res
      .status(result.error.status)
      .json({ error: result.error.message });
  }

  return res.status(201).json(result.value);
}