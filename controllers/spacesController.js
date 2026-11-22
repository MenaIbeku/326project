import * as spacesService from '../services/spacesService.js';

export async function index(req, res) {
  const spaces = await spacesService.listSpaces();

  return res.status(200).render('spaces', {
    title: 'Study Spaces',
    spaces,
  });
}

export async function show(req, res) {
  try {
    const space = await spacesService.getSpace(req.params.id);

    if (!space) return res.status(404).send('Study space not found.');

    return res.render('space', { space });
  } catch (error) {
    if (error.code === 'INVALID_SPACE_ID') {
      return res.status(400).send('Invalid study space ID.');
    }
    throw error;
  }
}

export async function create(req, res) {
  const isHtmx = req.get('HX-Request') === 'true';
  const data = isHtmx
    ? { ...req.body, groupFriendly: req.body.groupFriendly === 'on' }
    : req.body;

  try {
    const result = await spacesService.createSpace(data);

    if (!result.ok) {
      if (isHtmx) {
        return res.status(result.error.status)
          .set('HX-Retarget', '#form-error')
          .set('HX-Reswap', 'outerHTML')
          .render('partials/form-error', { error: result.error.message });
      }

      return res.status(result.error.status).json({ error: result.error.message });
    }

    if (isHtmx) {
      return res.status(201).render('partials/space', { space: result.value });
    }

    return res.status(201).json(result.value);
  } catch (error) {
    if (!isHtmx) throw error;

    return res.status(500)
      .set('HX-Retarget', '#form-error')
      .set('HX-Reswap', 'outerHTML')
      .render('partials/form-error', {
        error: 'Could not save the study space. Please try again.',
      });
  }
}
