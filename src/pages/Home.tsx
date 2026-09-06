import MovieCard from '../components/MovieCard'
import { mockMovies } from '../data/mockMovies'
import './Home.css'

function Home() {
  return (
    <main className="home">
      <section className="home__intro">
        <h1 className="home__heading">Discover movies</h1>
        <p className="home__subheading">A running list of what's worth watching next.</p>
      </section>

      <section className="home__grid" aria-label="Movies">
        {mockMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </section>
    </main>
  )
}

export default Home
