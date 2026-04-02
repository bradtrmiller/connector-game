// api/puzzle-index.js
// Returns a lightweight array of all puzzle dates (and nothing else).
// Used by the archive browser to render the list without downloading
// the full puzzles.json file.
//
// Example response: ["2026-03-11", "2026-03-12", "2026-03-13", ...]
//
// Uses the same environment variables as api/puzzle.js:
// GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    const url = `https://api.github.com/repos/${repo}/contents/puzzles.json?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch puzzles from GitHub" });
    }

    const puzzles = await response.json();

    // Return only the dates — nothing else
    const today = new Date().toLocaleDateString("en-CA");
    const dates = puzzles
      .map(p => p.date)
      .filter(d => d < today) // only past puzzles for the archive
      .sort((a, b) => b.localeCompare(a)); // most recent first

    // Cache for 10 minutes — index doesn't change often
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
    return res.status(200).json(dates);

  } catch (err) {
    console.error("api/puzzle-index error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
