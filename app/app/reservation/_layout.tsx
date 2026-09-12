import { Stack } from 'expo-router';

export default function ReservationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[reservationId]" />
      <Stack.Screen 
        name="charging" 
        options={{ 
          gestureEnabled: false,
          animation: 'slide_from_bottom',
        }} 
      />
    </Stack>
  );
}
