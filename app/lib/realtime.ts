/**
 * Realtime subscription helpers
 */

export function subscribeToAllChargers(callback: (charger: any) => void): any {
  return { unsubscribe: () => {} };
}

export function subscribeToCharger(chargerId: string, callback: (charger: any) => void): any {
  return { unsubscribe: () => {} };
}

export function subscribeToStationChargers(stationId: string, callback: (charger: any) => void): any {
  return { unsubscribe: () => {} };
}

export function subscribeToUserReservations(userId: string, callback: (reservation: any) => void): any {
  return { unsubscribe: () => {} };
}

export function unsubscribe(channel: any): void {
  if (channel?.unsubscribe) {
    channel.unsubscribe();
  }
}
