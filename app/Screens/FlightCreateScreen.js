import React from 'react';
import { View, StyleSheet, TextInput, Text, Button, Pressable } from 'react-native';
import { Formik } from 'formik';

import AppModal from '../components/AppModal';
 
function FlightCreateScreen(props) {
  return (
      <View style={styles.container}>
          <Formik initialValues={{ date: '', route: '' }} >
              {({ values, handleChange }) => (
                  <>
                      <Pressable>
                          <AppModal />
                          <TextInput
                            value={values.date}
                            onChangeText={handleChange('date')}
                            placeholder="Date"
                            onFocus={ picker => { console.log('onFocus') }} // open modal
                            onBlur={ picker => {console.log('onBlur')}} // close modal
                          />
                      </Pressable>
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