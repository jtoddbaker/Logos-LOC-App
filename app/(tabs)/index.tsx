import { StyleSheet, Text, View } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}><Testing></Testing> 👋</Text>
      <Text>Your React Native app is up and running.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});


