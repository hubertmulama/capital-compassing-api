export default async function handler(req, res) {
  const data = {
    status: "success",
    clients: [
      { id: "1", name: "John Doe", mt5_name: "JohnDoe_MT5", email: "john@example.com", state: "activated", created_at: "2025-10-06 08:53:47" },
      { id: "2", name: "Linet M.", mt5_name: "LinetFX", email: "linet@example.com", state: "activated", created_at: "2025-10-06 08:53:47" }
    ]
  };
  res.status(200).json(data);
}
