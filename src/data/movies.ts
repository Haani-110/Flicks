export type Movie = {
  id: number;
  title: string;
  year: number;
  rating: number;
  posterPath: string;
  backdropPath: string;
  genres: string[];
  overview: string;
  runtime: number;
};

const IMG = "https://image.tmdb.org/t/p";

export const movies: Movie[] = [
  {
    id: 1,
    title: "Dune: Part Two",
    year: 2024,
    rating: 8.3,
    posterPath: `${IMG}/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg`,
    backdropPath: `${IMG}/original/xOMo8BRK7PfcJv9JCnx7s5hj0DE.jpg`,
    genres: ["Sci-Fi", "Adventure"],
    overview:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    runtime: 166,
  },
  {
    id: 2,
    title: "Oppenheimer",
    year: 2023,
    rating: 8.1,
    posterPath: `${IMG}/w500/8Gxv8gSFCU0XGDykEGv7zR1n2wa.jpg`,
    backdropPath: `${IMG}/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg`,
    genres: ["Drama", "History"],
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    runtime: 180,
  },
  {
    id: 3,
    title: "The Batman",
    year: 2022,
    rating: 7.7,
    posterPath: `${IMG}/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg`,
    backdropPath: `${IMG}/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg`,
    genres: ["Crime", "Mystery", "Thriller"],
    overview:
      "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption.",
    runtime: 176,
  },
  {
    id: 4,
    title: "Everything Everywhere All at Once",
    year: 2022,
    rating: 7.8,
    posterPath: `${IMG}/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg`,
    backdropPath: `${IMG}/original/rKvCys0fMIIi1X9CJBx90Alx1c.jpg`,
    genres: ["Action", "Adventure", "Sci-Fi"],
    overview:
      "A middle-aged Chinese immigrant is swept up in an insane adventure, where she alone can save the world by exploring other universes.",
    runtime: 139,
  },
  {
    id: 5,
    title: "Top Gun: Maverick",
    year: 2022,
    rating: 8.2,
    posterPath: `${IMG}/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg`,
    backdropPath: `${IMG}/original/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg`,
    genres: ["Action", "Drama"],
    overview:
      "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN's elite graduates.",
    runtime: 130,
  },
  {
    id: 6,
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    rating: 8.4,
    posterPath: `${IMG}/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg`,
    backdropPath: `${IMG}/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg`,
    genres: ["Animation", "Action", "Adventure"],
    overview:
      "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    runtime: 140,
  },
  {
    id: 7,
    title: "Barbie",
    year: 2023,
    rating: 7.0,
    posterPath: `${IMG}/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg`,
    backdropPath: `${IMG}/original/nHf61UzkfFno5X1ofIhugCPus2R.jpg`,
    genres: ["Comedy", "Adventure", "Fantasy"],
    overview:
      "Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land. However, when they get a chance to go to the real world, they soon discover the joys and perils of living among humans.",
    runtime: 114,
  },
  {
    id: 8,
    title: "Poor Things",
    year: 2023,
    rating: 7.8,
    posterPath: `${IMG}/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg`,
    backdropPath: `${IMG}/original/bQS43HSLZzMjZkcHJz4fGc7fNdz.jpg`,
    genres: ["Sci-Fi", "Romance", "Comedy"],
    overview:
      "The incredible tale about the fantastical evolution of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter.",
    runtime: 141,
  },
  {
    id: 9,
    title: "Killers of the Flower Moon",
    year: 2023,
    rating: 7.6,
    posterPath: `${IMG}/w500/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg`,
    backdropPath: `${IMG}/original/1X7vow16X7CnCoexXh4H4F2yDJv.jpg`,
    genres: ["Crime", "Drama", "History"],
    overview:
      "When oil is discovered in 1920s Oklahoma under Osage Nation land, the Osage people are murdered one by one - until the FBI steps in to unravel the mystery.",
    runtime: 206,
  },
];

export const getMovie = (id: string | undefined): Movie | undefined =>
  movies.find((m) => m.id === Number(id));
