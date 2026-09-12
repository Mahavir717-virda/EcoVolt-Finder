/**
 * EcoVolt Background Workers
 */

import { startPredictionWorker, dispatchAllUserPredictions } from './prediction.worker';
import { startReminderWorker, processBookingReminders } from './reminder.worker';
import { predictionQueue } from './queue';

export function startBackgroundWorkers(): void {
  startReminderWorker();
  startPredictionWorker();
}

export {
  predictionQueue,
  startPredictionWorker,
  dispatchAllUserPredictions,
  startReminderWorker,
  processBookingReminders,
};
