import React from 'react';
import { View, StyleSheet, TextInput, Text, Button } from 'react-native';
import { Formik } from 'formik';
import DatePicker from '../components/CalendarPicker';
 

function FlightCreateScreen(props) {
  return (
      <View style={styles.container}>
          <Formik initialValues={{ date: '', route: '' }} >
              {({ values, handleChange }) => (
    <>
      <DatePicker></DatePicker>
      <TextInput
        value={values.date}
        onChangeText={handleChange('date')}
        placeholder="Date"
      />
      <TextInput
        value={values.route}
        onChangeText={handleChange('route')}
        placeholder="Route"
        
      />
      <Text>{JSON.stringify(values)}</Text>
      <Button title='Sign In' />
    </>  
  )}        
</Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
});

export default FlightCreateScreen;