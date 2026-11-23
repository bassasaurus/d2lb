module.exports = [{
  ignores: ["node_modules/**", "android/**", "ios/**", ".expo/**", "dist/**"],
}, {
  files: ["App.js", "index.js", "app/**/*.js", "app/**/*.mjs", "scripts/*.mjs", "*.config.js"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: Object.fromEntries(["__DEV__", "console", "fetch", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "module", "require", "process", "alert", "FormData", "URL", "AbortController", "requestAnimationFrame"].map(name => [name, "readonly"])),
  },
  plugins: {
    local: { rules: {
      "jsx-component-defined": {
        meta: { type: "problem", schema: [], messages: { undefined: "JSX component '{{name}}' is not defined. Import or declare it before rendering." } },
        create(context) {
          return { JSXOpeningElement(node) {
            let root = node.name;
            while (root.type === "JSXMemberExpression") root = root.object;
            if (root.type !== "JSXIdentifier" || !/^[A-Z]/.test(root.name)) return;
            let scope = context.sourceCode.getScope(node);
            while (scope) {
              if (scope.variables.some(variable => variable.name === root.name)) return;
              scope = scope.upper;
            }
            context.report({ node: root, messageId: "undefined", data: { name: root.name } });
          } };
        },
      },
    } },
  },
  rules: { "no-undef": "error", "local/jsx-component-defined": "error" },
}];
