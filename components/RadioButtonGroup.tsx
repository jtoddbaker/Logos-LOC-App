import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// RadioButtonGroup props:
// options = [{ label: string, value: string }]
// selected = currently selected value
// onSelect = function to call when option selected
const RadioButtonGroup = ({ options, selected, onSelect }) => {
  return (
    <View>
      {options.map(({ label, value }) => (
        <TouchableOpacity
          key={value}
          style={styles.radioOption}
          onPress={() => onSelect(value)}
          activeOpacity={0.7}
        >
          <View style={[styles.radioCircle, selected === value && styles.radioSelected]} />
          <Text style={styles.radioLabel}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4f46e5', // Indigo 700
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#4f46e5', // Indigo 700 filled circle
  },
  radioLabel: {
    fontSize: 16,
    color: '#374151', // Gray 700
  },
});

export default RadioButtonGroup;
