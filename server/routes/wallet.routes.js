import { Router } from 'express';
import {
  getWalletController,
  listWalletsController,
  registerWalletController,
  requestWalletChallenge,
  syncWalletController,
} from '../controllers/wallet.controller.js';

const walletRouter = Router();

walletRouter.get('/wallets', listWalletsController);
walletRouter.post('/wallets/challenge', requestWalletChallenge);
walletRouter.post('/wallets/register', registerWalletController);
walletRouter.get('/wallets/:address', getWalletController);
walletRouter.post('/wallets/:address/sync', syncWalletController);

export default walletRouter;
