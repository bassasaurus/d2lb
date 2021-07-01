import React from 'react';
import { View, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from "../components/Icon"

function AddButton(props) {
  return (
      <TouchableOpacity
        style={{
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        position: 'absolute',
        bottom: 10,
        right: 10,
        height: 70,
        backgroundColor: 'green',
        borderRadius: 100,
    }}>
          <Icon name={'plus'} size={100} iconColor={"white"}  />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    button: {
        width: 60,  
        height: 60,   
        borderRadius: 30,            
        backgroundColor: 'green',                                    
        position: 'absolute',                                          
        bottom: 40,                                                    
        right: 10,
    },

    
});

export default AddButton;