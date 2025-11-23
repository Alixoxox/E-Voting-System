import cron from 'node-cron';
import { runAutoSeatChooser } from '../utils/Services.js';
import { runDailyElectionCheck } from '../services/electionEngine.js';
//runs everyday at midnight
cron.schedule('0 0 * * *', async () => {
  await runDailyElectionCheck();
});
cron.schedule('0 0 * * *', async () => {
  console.log("🕐 Cron triggered: auto seat chooser");
  await runAutoSeatChooser();
});