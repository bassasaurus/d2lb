import Platform from "react-native";

export const STYLES = {
  blue: "mediumblue",
  lightblue: "lightblue",
  itemBackground: "gainsboro",
  white: "#fff",
  black: "#000",
  highlight: "#DDDDDD",
  danger: "red",
  green: "green",
  grey: "grey",

  font: Platform.OS === "android" ? "Roboto" : "Avenir",
  fontWeightBold: "800",
  fontWeightNormal: "400",
  fontSizeNormal: 13,
  fontSizeLarge: 15,
  fontSizeExtraLarge: 20,

  borderRadius: 5,
  inputBorderWidth: 1,
  inputBorderColor: "grey",
};
