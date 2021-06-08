import Platform from "react-native";

export const STYLES = {
  blue: "mediumblue",
  itemBackground: "gainsboro",
  white: "#fff",
  black: "#000",
  highlight: "#DDDDDD",

  font: Platform.OS === "android" ? "Roboto" : "Avenir",
  bold: "800",
  large: "40",
};
