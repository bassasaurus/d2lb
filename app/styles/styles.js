import Platform from "react-native";

export const STYLES = {
  blue: "mediumblue",
  itemBackground: "gainsboro",
  white: "#fff",
  black: "#000",
  highlight: "#DDDDDD",
  danger: "red",

  font: Platform.OS === "android" ? "Roboto" : "Avenir",
  fontWeightBold: "800",
  fontWeightNormal: "400",
  fontSizeNormal: 13,
  fontSizeLarge: 15,

  borderRadius: 5,
};
