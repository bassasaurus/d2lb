import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { Formik } from 'formik';
import AppModal  from '../components/AppModal';
 
function FlightCreateScreen(props)
{
  const [visible, setVisible] = useState(false)

  return (
      <View style={styles.container}>
          <Formik initialValues={{ date: '', route: '' }} >
              {({ values, handleChange }) => (
          <>
                    <TextInput
                        value={values.date}
                        onChangeText={handleChange('date')}
                        placeholder="Date"
                        onFocus={ () => { setVisible(true) }} // open modal
                        onBlur={ () => {console.log('onBlur')}} // close modal
                    />
                    <TextInput
                        value={values.route}
                        onChangeText={handleChange('route')}
                        placeholder="Route"
                    />
                    <Text>{JSON.stringify(values)}</Text>
                    <AppModal
                      visible={visible}>
                    </AppModal>
                    </>  
                )}        
            </Formik>
        </View>
                    );
                    };

const styles = StyleSheet.create({
    container: {},

    modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
    },

    centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
    
});

export default FlightCreateScreen;