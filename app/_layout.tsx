import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Recommended Protocol', // This sets the tab and header title
        }}
      />
    </Stack>
  );
}
