import globals from "./server/node_modules/globals/index.js"
import eslintRecommended from "./server/node_modules/@eslint/js/src/index.js"
import eslintConfigPrettier from "./server/node_modules/eslint-config-prettier/index.js"
import prettier from "./server/node_modules/eslint-plugin-prettier/eslint-plugin-prettier.js"
import react from "./server/node_modules/eslint-plugin-react/index.js"
import reactRefresh from "./server/node_modules/eslint-plugin-react-refresh/index.js"
import reactHooks from "./server/node_modules/eslint-plugin-react-hooks/index.js"
import ftFlow from "./server/node_modules/eslint-plugin-ft-flow/dist/index.js"
import hermesParser from "./server/node_modules/hermes-eslint/dist/index.js"

const reactRecommended = react.configs.recommended
const jsxRuntime = react.configs["jsx-runtime"]

export default [
  eslintRecommended.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["**/*.test.js"],
    languageOptions: {
      parser: hermesParser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node
      }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    settings: { react: { version: "18.2" } },
    plugins: {
      ftFlow,
      react,
      "jsx-runtime": jsxRuntime,
      "react-hooks": reactHooks,
      prettier
    },
    rules: {
      ...reactRecommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...ftFlow.recommended,
      // Basic code quality
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-empty": "warn",
      "no-extra-boolean-cast": "warn",
      "prettier/prettier": "warn",
      // Enhanced code quality rules
      "complexity": ["warn", { max: 10 }],
      "max-depth": ["warn", { max: 4 }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", { max: 5 }],
      "no-magic-numbers": ["warn", { ignore: [0, 1, -1, 2], ignoreArrayIndexes: true }],
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-script-url": "error",
      "prefer-const": "warn",
      "prefer-arrow-callback": "warn",
      "arrow-body-style": ["warn", "as-needed"],
      "object-shorthand": "warn",
      "prefer-template": "warn",
      "no-var": "warn",
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "all"],
      "dot-notation": "warn"
    }
  },
  {
    files: ["frontend/src/**/*.js"],
    plugins: {
      ftFlow,
      prettier
    },
    rules: {
      "prettier/prettier": "warn"
    }
  },
  {
    files: [
      "server/endpoints/**/*.js",
      "server/models/**/*.js",
      "server/swagger/**/*.js",
      "server/utils/**/*.js",
      "server/index.js"
    ],
    rules: {
      "no-undef": "warn"
    }
  },
  {
    files: ["frontend/src/**/*.jsx"],
    plugins: {
      ftFlow,
      react,
      "jsx-runtime": jsxRuntime,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier
    },
    rules: {
      ...jsxRuntime.rules,
      "react/prop-types": "off", // FIXME
      "react-refresh/only-export-components": "warn",
      // React-specific quality rules
      "react/jsx-no-target-blank": "warn",
      "react/jsx-no-duplicate-props": "warn",
      "react/jsx-key": "warn",
      "react/no-array-index-key": "warn",
      "react/no-deprecated": "warn",
      "react/no-unsafe": "warn",
      "react/prefer-stateless-function": "warn",
      "react/self-closing-comp": "warn",
      "react/jsx-boolean-value": ["warn", "never"],
      "react/jsx-fragments": ["warn", "syntax"],
      "react/jsx-no-useless-fragment": "warn"
    }
  }
]
