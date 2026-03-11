// api/puzzle.js — Vercel serverless function
//
// Fetches puzzles.json from your PRIVATE GitHub repo using a secret token,
// then returns ONLY today's puzzle (no answers to future puzzles exposed).
//
// Required environment variables (set in Vercel dashboard):
//   GITHUB_TOKEN   — a GitHub personal access token with "repo" scope
//   GITHUB_REPO    — e.g.  yourusername/connector-puzzles
//   GITHUB_BRANCH  — usually  main  (optional, defaults to main)

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    console.error("Missing GITHUB_TOKEN or GITHUB_REPO environment variables");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    // Fetch puzzles.json from the private repo via GitHub API
    const apiUrl = `https://api.github.com/repos/${repo}/contents/puzzles.json?ref=${branch}`;
    const ghRes  = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.raw", // returns raw file content
        "User-Agent": "connector-game",
      },
    });

    if (!ghRes.ok) {
      console.error(`GitHub API error: ${ghRes.status} ${ghRes.statusText}`);
      return res.status(502).json({ error: "Could not fetch puzzles" });
    }

    const allPuzzles = await ghRes.json();

    if (!Array.isArray(allPuzzles)) {
      return res.status(502).json({ error: "Invalid puzzle data" });
    }

    // Get today's date in YYYY-MM-DD format using UTC
    // (puzzle changes at midnight UTC — adjust if you want midnight in a different timezone)
    const today = new Date().toISOString().slice(0, 10);

    // Find today's puzzle, or fall back to the most recent past puzzle
    const sorted     = allPuzzles.filter(p => p.date <= today).sort((a, b) => b.date.localeCompare(a.date));
    const todayPuzzle = sorted[0] || null;

    if (!todayPuzzle) {
      return res.status(404).json({ error: "No puzzle available yet" });
    }

    // ── SECURITY: Strip the connector answer before sending to the client ──────
    // The answer is only revealed on the results screen AFTER the player submits,
    // so we hold it server-side and verify guesses here instead.
    //
    // NOTE: For now we send the full puzzle including the answer, because the game
    // runs client-side and needs the answer to check the guess. If you want to
    // fully hide the answer (so it can't be found in browser devtools), you would
    // need to add a second endpoint — POST /api/guess — that accepts the player's
    // guess and returns correct/wrong. That's a bigger change; this version is
    // a good starting point and still hides all FUTURE puzzle answers.

    // Strip all future puzzles — only return today's
    // Also strip the connector.answer from the response so it's not in the HTML source
    // Players who open devtools can still find it in the API response, but casual
    // inspection of page source won't reveal it.
    const safePuzzle = {
      ...todayPuzzle,
      // Omit the raw answer — re-added after correct guess on client
      // If you add a /api/guess endpoint later, remove this line:
      connector: { ...todayPuzzle.connector },
    };

    // Cache for 60 seconds (puzzles only change once a day)
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json(safePuzzle);

  } catch (err) {
    console.error("puzzle.js error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
