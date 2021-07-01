import React from 'react';
import { View, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from "../components/Icon"
import { STYLES } from '../styles/styles';

function AddButton({ onPress }) {
  return (
      <TouchableOpacity
      style={styles.container}
      onPress = {onPress}>
          <Icon name={'plus'} size={100} iconColor={STYLES.white}  />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: STYLES.white,
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        position: 'absolute',
        bottom: 50,
        right: 10,
        height: 70,
        backgroundColor: STYLES.green,
        borderRadius: 100,
    },
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