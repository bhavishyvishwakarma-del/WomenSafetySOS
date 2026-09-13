import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Vibration,
  StatusBar,
} from 'react-native';
import StorageService from '../services/StorageService';

const CalculatorCamouflageScreen = ({ onUnlockSecret }) => {
  const [displayValue, setDisplayValue] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [secretSequence, setSecretSequence] = useState('');

  const handleDigit = async (digit) => {
    // Append to secret pin sequence tracking
    const newSequence = secretSequence + digit;
    setSecretSequence(newSequence);

    if (waitingForOperand) {
      setDisplayValue(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? String(digit) : displayValue + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
    } else if (displayValue.indexOf('.') === -1) {
      setDisplayValue(displayValue + '.');
    }
  };

  const handleClear = () => {
    setDisplayValue('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setSecretSequence('');
  };

  const handleToggleSign = () => {
    const value = parseFloat(displayValue);
    setDisplayValue(String(-value));
  };

  const handlePercent = () => {
    const value = parseFloat(displayValue);
    setDisplayValue(String(value / 100));
  };

  const handleOperator = (nextOperator) => {
    const inputValue = parseFloat(displayValue);

    if (previousValue == null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operator);
      setPreviousValue(newValue);
      setDisplayValue(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (prev, next, op) => {
    switch (op) {
      case '+': return prev + next;
      case '-': return prev - next;
      case '×': return prev * next;
      case '÷': return next !== 0 ? prev / next : 'Error';
      default: return next;
    }
  };

  const handleEquals = async () => {
    // Check if the secret unlock PIN was entered
    // By default "9999" followed by "="
    const settings = await StorageService.getSettings();
    const unlockPin = settings.duressPin || '9999';

    if (secretSequence.endsWith(unlockPin) || displayValue === unlockPin) {
      // Secret code recognized! Discreet haptic acknowledgement and unlock
      Vibration.vibrate(80);
      setDisplayValue('0');
      setSecretSequence('');
      if (onUnlockSecret) {
        onUnlockSecret();
      }
      return;
    }

    // Normal arithmetic calculation
    const inputValue = parseFloat(displayValue);
    if (operator && previousValue != null) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplayValue(String(result));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      setSecretSequence('');
    }
  };

  const renderButton = (text, onPress, type = 'number') => {
    let buttonStyle = styles.numberButton;
    let textStyle = styles.numberButtonText;

    if (type === 'operator') {
      buttonStyle = styles.operatorButton;
      textStyle = styles.operatorButtonText;
    } else if (type === 'function') {
      buttonStyle = styles.functionButton;
      textStyle = styles.functionButtonText;
    }

    return (
      <TouchableOpacity
        key={text}
        activeOpacity={0.7}
        style={[styles.button, buttonStyle, text === '0' && styles.zeroButton]}
        onPress={onPress}
      >
        <Text style={[styles.buttonText, textStyle]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Calculator Display Screen */}
      <View style={styles.displayContainer}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.displayText}
        >
          {displayValue}
        </Text>
      </View>

      {/* Keypad Grid */}
      <View style={styles.keypad}>
        <View style={styles.row}>
          {renderButton('C', handleClear, 'function')}
          {renderButton('+/-', handleToggleSign, 'function')}
          {renderButton('%', handlePercent, 'function')}
          {renderButton('÷', () => handleOperator('÷'), 'operator')}
        </View>

        <View style={styles.row}>
          {renderButton('7', () => handleDigit(7))}
          {renderButton('8', () => handleDigit(8))}
          {renderButton('9', () => handleDigit(9))}
          {renderButton('×', () => handleOperator('×'), 'operator')}
        </View>

        <View style={styles.row}>
          {renderButton('4', () => handleDigit(4))}
          {renderButton('5', () => handleDigit(5))}
          {renderButton('6', () => handleDigit(6))}
          {renderButton('-', () => handleOperator('-'), 'operator')}
        </View>

        <View style={styles.row}>
          {renderButton('1', () => handleDigit(1))}
          {renderButton('2', () => handleDigit(2))}
          {renderButton('3', () => handleDigit(3))}
          {renderButton('+', () => handleOperator('+'), 'operator')}
        </View>

        <View style={styles.row}>
          {renderButton('0', () => handleDigit(0))}
          {renderButton('.', handleDecimal)}
          {renderButton('=', handleEquals, 'operator')}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  displayText: {
    color: '#ffffff',
    fontSize: 68,
    fontWeight: '300',
    textAlign: 'right',
  },
  keypad: {
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroButton: {
    width: 168,
    alignItems: 'flex-start',
    paddingLeft: 30,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '500',
  },
  numberButton: {
    backgroundColor: '#333333',
  },
  numberButtonText: {
    color: '#ffffff',
  },
  functionButton: {
    backgroundColor: '#a5a5a5',
  },
  functionButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  operatorButton: {
    backgroundColor: '#ff9f0a',
  },
  operatorButtonText: {
    color: '#ffffff',
    fontSize: 34,
  },
});

export default CalculatorCamouflageScreen;
