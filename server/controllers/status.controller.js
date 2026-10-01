export const getApiStatus = (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'solvex-api',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    environment: process.env.NODE_ENV || 'development',
  });
};
