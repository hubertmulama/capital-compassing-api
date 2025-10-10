import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    // connect to your InfinityFree MySQL database
    const connection = await mysql.createConnection({
      host: "sql.freedb.tech",         // e.g., sqlXXX.infinityfree.com
      user: "freedb_Hubert_mulama",
      password: "#?wqa5T4m5GB%JB",
      database: "freedb_Capital compassing",
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


