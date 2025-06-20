import { Slot } from 'expo-router';
import { Title } from 'expo-router/head';

export default function Layout() {
  return (
    <>
      <Title>Logos App</Title>
      <Slot />
    </>
  );
}

