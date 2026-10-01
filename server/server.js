import app from './app.js';
import { startWalletSyncScheduler } from './services/wallet-sync.service.js';

const PORT = Number(process.env.PORT) || 8080;
startWalletSyncScheduler();

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
