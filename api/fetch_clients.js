export default async function handler(req, res) {
  try {
    const response = await fetch("https://capitalcompassing.infinityfree.me/fetch_clients.php", {
      headers: { "User-Agent": "Mozilla/5.0" } // makes it look like a browser
    });
    const data = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
