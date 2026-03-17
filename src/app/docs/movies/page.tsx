// ─────────────────────────────────────────────────
// Movies — Docs page
// Edit this file directly to update the movies docs.
// ─────────────────────────────────────────────────

const sampleRows = [
  { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi" },
  { id: 2, title: "The Godfather", year: 1972, genre: "Crime" },
  { id: 3, title: "Interstellar", year: 2014, genre: "Sci-Fi" },
  { id: 4, title: "Parasite", year: 2019, genre: "Thriller" },
];

const endpoints = [
  { method: "GET", path: "/api/en/v1/movies", description: "List all movies", auth: "any" },
  { method: "GET", path: "/api/en/v1/movies/:id", description: "Get a single movie", auth: "any" },
  { method: "POST", path: "/api/en/v1/movies", description: "Create a movie", auth: "paid" },
  { method: "PUT", path: "/api/en/v1/movies/:id", description: "Update your movie", auth: "paid" },
  { method: "DELETE", path: "/api/en/v1/movies/:id", description: "Delete your movie", auth: "paid" },
];

const methodColor: Record<string, string> = {
  GET: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  POST: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  PUT: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  DELETE: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
};

export default function MoviesDocsPage() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Movies</h1>
        <p className="mt-2 text-muted-foreground">
          A collection of movies with title, year, and genre. System rows are read-only;
          paid users can add their own.
        </p>
      </div>

      {/* Fields */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Fields
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Field</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-4 py-2.5 font-mono text-xs text-foreground">id</td><td className="px-4 py-2.5 text-muted-foreground">integer</td><td className="px-4 py-2.5 text-muted-foreground">Unique identifier</td></tr>
              <tr><td className="px-4 py-2.5 font-mono text-xs text-foreground">title</td><td className="px-4 py-2.5 text-muted-foreground">string</td><td className="px-4 py-2.5 text-muted-foreground">Movie title</td></tr>
              <tr><td className="px-4 py-2.5 font-mono text-xs text-foreground">year</td><td className="px-4 py-2.5 text-muted-foreground">integer</td><td className="px-4 py-2.5 text-muted-foreground">Release year</td></tr>
              <tr><td className="px-4 py-2.5 font-mono text-xs text-foreground">genre</td><td className="px-4 py-2.5 text-muted-foreground">string</td><td className="px-4 py-2.5 text-muted-foreground">Film genre</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample data */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sample data
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {Object.keys(sampleRows[0]).map((key) => (
                  <th key={key} className="text-left px-4 py-2.5 font-medium text-foreground">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sampleRows.map((row) => (
                <tr key={row.id}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Endpoints */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Endpoints
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-foreground w-20">Method</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Path</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((ep) => (
                <tr key={ep.method + ep.path}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold font-mono ${methodColor[ep.method]}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{ep.path}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{ep.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{ep.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Example response */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Example response
        </h2>
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-xs font-mono text-muted-foreground mb-2">GET /api/en/v1/movies</p>
          <pre className="text-sm font-mono text-foreground overflow-x-auto">{`[
  {
    "id": 1,
    "title": "Inception",
    "year": 2010,
    "genre": "Sci-Fi"
  },
  {
    "id": 2,
    "title": "The Godfather",
    "year": 1972,
    "genre": "Crime"
  }
]`}</pre>
        </div>
      </div>
    </div>
  );
}
