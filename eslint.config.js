const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  {
    ignores: ["dist/", "node_modules/", "coverage/", "*.cjs", "eslint.config.js", "commitlint.config.js"],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["test/*.test.ts"],
        },
        tsconfigRootDir: __dirname,
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },
];
