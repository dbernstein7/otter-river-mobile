import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  return (
    <View style={[styles.container, { width: dimensions.width, height: dimensions.height }]}>
      <Text style={styles.title}>Otter River Adventure</Text>
      <Text style={styles.subtitle}>Mobile Version</Text>
      <View style={styles.gameContainer}>
        {/* Game canvas will go here */}
        <Text style={styles.placeholder}>Game Canvas</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  gameContainer: {
    width: '100%',
    height: '70%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
}); 