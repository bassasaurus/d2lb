module.exports = [{
  ignores: ["node_modules/**", "android/**", "ios/**", ".expo/**", "dist/**"],
}, {
  files: ["App.js", "index.js", "app/**/*.js", "*.config.js"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries(["__DEV__", "console", "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "module", "require", "process", "alert", "FormData", "URL", "AbortController", "requestAnimationFrame"].map(name => [name, "readonly"])),
  },
  rules: { "no-undef": "error" },
}];
