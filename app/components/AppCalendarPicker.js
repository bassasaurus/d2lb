import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CalendarPicker from 'react-native-calendar-picker';
import STYLES from '../styles/styles'

function AppCalendarPicker(props)
{
  const [date, setDate] = useState(null)

  return (
    <CalendarPicker
      showDayStragglers={true}
      selectedDayColor="lightblue"
      onDateChange={() => setDate(date)}>
    </CalendarPicker>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default AppCalendarPicker;