const express = require('express');
const router = express.Router();
const Movie = require('../models/movie');
const Director = require('../models/director');
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
const { render } = require('ejs');

// All movies
router.get('/', async (req, res) => {
	let query = Movie.find();
	if (req.query.title != null && req.query.title != '') {
		query = query.regex('title', new RegExp(req.query.title, 'i'));
	}
	if (req.query.releasedBefore != null && req.query.releasedBefore != '') {
		query = query.lte('releaseDate', req.query.releasedBefore);
	}
	if (req.query.releasedAfter != null && req.query.releasedAfter != '') {
		query = query.gte('releaseDate', req.query.releasedAfter);
	}
	try {
		const movies = await query.exec();
		res.render('movies/index', {
			movies: movies,
			searchOptions: req.query,
		});
	} catch {
		res.redirect('/');
	}
});

// New Movie
router.get('/new', async (req, res) => {
	renderNewPage(res, new Movie());
});

// Create Movie
router.post('/', async (req, res) => {
	const movie = new Movie({
		title: req.body.title,
		director: req.body.director,
		releaseDate: new Date(req.body.releaseDate),
		runtime: req.body.runtime,
		synopsis: req.body.synopsis,
	});
	saveCover(movie, req.body.cover);
	try {
		const newMovie = await movie.save();
		res.redirect('movies');
	} catch {
		renderNewPage(res, movie, true);
	}
});

// Show movie route
router.get('/:id', async (req, res) => {
	try {
		const movie = await Movie.findById(req.params.id).populate('director').exec();
		res.render('movies/show', {
			movie: movie,
		});
	} catch {
		res.redirect('/');
	}
});

// Edit movie route
router.get('/:id/edit', async (req, res) => {
	try {
		const movie = await Movie.findById(req.params.id);
		renderEditPage(res, movie);
	} catch {
		res.redirect('/');
	}
});

// Update Movie
router.put('/:id', async (req, res) => {
	let movie;
	try {
		movie = await Movie.findById(req.params.id);
		movie.title = req.body.title;
		movie.director = req.body.director;
		movie.releaseDate = new Date(req.body.releaseDate);
		movie.runtime = req.body.runtime;
		movie.synopsis = req.body.synopsis;
		if (req.body.cover != null && req.body.cover !== '') {
			saveCover(movie, req.body.cover);
		}
		await movie.save();
		res.redirect(`/movies/${movie.id}`);
	} catch {
		if (movie) {
			renderEditPage(res, movie, true);
		} else {
			res.redirect('/');
		}
	}
});

// Delete movie page
router.delete('/:id', async (req, res) => {
	let movie;
	try {
		movie = await Movie.findById(req.params.id);
		await movie.remove();
		res.redirect('/movies');
	} catch {
		if (movie) {
			res.render('movies/show', {
				movie: movie,
				errorMessage: 'Could not remove movie',
			});
		} else {
			res.redirect('/');
		}
	}
});

async function renderNewPage(res, movie, hasError = false) {
	renderFormPage(res, movie, 'new', hasError);
}

async function renderEditPage(res, movie, hasError = false) {
	renderFormPage(res, movie, 'edit', hasError);
}

async function renderFormPage(res, movie, form, hasError = false) {
	try {
		const directors = await Director.find({});
		const params = {
			directors: directors,
			movie: movie,
		};
		if (hasError) {
			if (form === 'edit') {
				params.errorMessage = 'Error updating movie';
			} else {
				params.errorMessage = 'Error creating movie';
			}
		}
		res.render(`movies/${form}`, params);
	} catch {
		res.redirect('/movies');
	}
}

function saveCover(movie, coverEncoded) {
	if (coverEncoded == null) return;
	const cover = JSON.parse(coverEncoded);
	if (cover != null && imageMimeTypes.includes(cover.type)) {
		movie.coverImage = new Buffer.from(cover.data, 'base64');
		movie.coverImageType = cover.type;
	}
}

module.exports = router;
