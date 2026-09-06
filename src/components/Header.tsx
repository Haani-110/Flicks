import { useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink } from 'react-router-dom'
import './Header.css'

function Header() {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Search functionality will be implemented later.
  }

  return (
    <header className="header">
      <div className="header__inner">
        <NavLink to="/" className="header__brand">
          Flicks
        </NavLink>

        <nav className="header__nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'header__link header__link--active' : 'header__link'
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/watchlist"
            className={({ isActive }) =>
              isActive ? 'header__link header__link--active' : 'header__link'
            }
          >
            Watchlist
          </NavLink>
        </nav>

        <form className="header__search" onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            className="header__search-input"
            placeholder="Search movies..."
            aria-label="Search movies"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button type="submit" className="header__search-button">
            Search
          </button>
        </form>
      </div>
    </header>
  )
}

export default Header
