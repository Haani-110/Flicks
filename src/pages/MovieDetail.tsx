import { Link, useParams } from 'react-router-dom'
import { mockMovies } from '../data/mockMovies'
import './MovieDetail.css'

function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const movie = mockMovies.find((candidate) => candidate.id === id)

  if (!movie) {
    return (
      <main className="movie-detail movie-detail--empty">
        <h1 className="movie-detail__not-found-heading">Movie not found</h1>
        <p className="movie-detail__not-found-text">
          We couldn't find a movie with that ID.
        </p>
        <Link to="/" className="movie-detail__back-link">
          &larr; Back to Home
        </Link>
      </main>
    )
  }

  return (
    <main className="movie-detail">
      <Link to="/" className="movie-detail__back-link">
        &larr; Back to Home
      </Link>

      <div className="movie-detail__content">
        <div className="movie-detail__poster-wrap">
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="movie-detail__poster"
          />
        </div>

        <div className="movie-detail__info">
          <h1 className="movie-detail__title">{movie.title}</h1>
          <p className="movie-detail__meta">
            {movie.year} · {movie.genre}
          </p>
          <span className="movie-detail__rating">★ {movie.rating.toFixed(1)}</span>
          <p className="movie-detail__description">{movie.description}</p>
        </div>
      </div>
    </main>
  )
}

export default MovieDetail
