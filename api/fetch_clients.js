import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    // connect to your InfinityFree MySQL database
    const connection = await mysql.createConnection({
      host: "sql100.infinityfree.com",         // e.g., sqlXXX.infinityfree.com
      user: "if0_40104742",
      password: "QqeV2uBH782g",
      database: "if0_40104742_infinityfreecapitalcompassing",
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

