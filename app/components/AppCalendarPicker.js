import React from 'react';
import { View, StyleSheet } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import STYLES from '../styles/styles'

function AppCalendarPicker(props){

  return (
    <CalendarPicker
      selectedDayColor="lightblue">
    </CalendarPicker>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default AppCalendarPicker;