import Platform from "react-native";

export const STYLES = {
  blue: "mediumblue",
  itemBackground: "gainsboro",
  white: "#fff",
  black: "#000",
  highlight: "#DDDDDD",

  font: Platform.OS === "android" ? "Roboto" : "Avenir",
  fontWeightBold: "800",
  fontSizeNormal: 15,
  fontWeightNormal: "500",

  borderRadius: 8,
};
