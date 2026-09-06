import type { Movie } from '../types/movie'
import './MovieCard.css'

interface MovieCardProps {
  movie: Movie
}

function MovieCard({ movie }: MovieCardProps) {
  return (
    <article className="movie-card">
      <div className="movie-card__poster-wrap">
        <img
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          className="movie-card__poster"
          loading="lazy"
        />
        <span className="movie-card__rating">{movie.rating.toFixed(1)}</span>
      </div>
      <div className="movie-card__info">
        <h3 className="movie-card__title">{movie.title}</h3>
        <p className="movie-card__meta">
          {movie.year} · {movie.genre}
        </p>
      </div>
    </article>
  )
}

export default MovieCard
