module.exports = {
  env: {
    commonjs: true,
    es2020: true,
    node: true,
    mocha: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {},
};
