import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FontTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔤 Font Test</Text>
      <Text style={styles.heeboRegular}>Heebo Regular - שלום עולם</Text>
      <Text style={styles.heeboMedium}>Heebo Medium - ברוכים הבאים</Text>
      <Text style={styles.heeboBold}>Heebo Bold - מצוין!</Text>
      <Text style={styles.heeboLight}>Heebo Light - קל ונעים</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  heeboRegular: {
    fontFamily: 'Heebo-Regular',
    fontSize: 16,
    marginVertical: 5,
    color: '#333',
  },
  heeboMedium: {
    fontFamily: 'Heebo-Medium',
    fontSize: 16,
    marginVertical: 5,
    color: '#333',
  },
  heeboBold: {
    fontFamily: 'Heebo-Bold',
    fontSize: 16,
    marginVertical: 5,
    color: '#333',
  },
  heeboLight: {
    fontFamily: 'Heebo-Light',
    fontSize: 16,
    marginVertical: 5,
    color: '#333',
  },
});

export default FontTest;