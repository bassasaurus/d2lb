import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Text, Modal } from 'react-native';
import { Formik } from 'formik';
import CalendarPicker from 'react-native-calendar-picker';
 
function FlightCreateScreen(props)
{
  const [visible, setVisible] = useState(false)
  const [date, setDate] = useState(null)

  const onDateChange = (date) => {
    //function to handle the date change
    console.log(date)
    setDate(date);
    
  };

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
            />
            <TextInput
                value={values.route}
                onChangeText={handleChange('route')}
                placeholder="Route"
            />
    
            <Text>{JSON.stringify(values)}</Text>
    
            <Modal
              animationType="slide"
              transparent={true}
              visible={visible}
            >
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <CalendarPicker
                    showDayStragglers={true}
                    selectedDayColor="lightblue"
                    onDateChange={() => onDateChange()}>
                  </CalendarPicker>
                </View>
              </View>
        </Modal>
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