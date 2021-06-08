import Platform from "react-native";

export const STYLES = {
  blue: "mediumblue",
  itemBackground: "gainsboro",
  white: "#fff",
  black: "#000",
  highlight: "#DDDDDD",

  font: Platform.OS === "android" ? "Roboto" : "Avenir",
  fontWeightBold: "800",
  fontWeightNormal: "400",
  fontSizeNormal: 13,
  fontSizeLarge: 15,

  borderRadius: 8,
};
