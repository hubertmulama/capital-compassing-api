import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    // connect to your InfinityFree MySQL database
    const connection = await mysql.createConnection({
      host: "YOUR_DB_HOST",         // e.g., sqlXXX.infinityfree.com
      user: "YOUR_DB_USERNAME",
      password: "YOUR_DB_PASSWORD",
      database: "YOUR_DB_NAME",
    });

    const [rows] = await connection.execute("SELECT * FROM clients");
    connection.end();

    res.status(200).json({
      status: "success",
      clients: rows,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
