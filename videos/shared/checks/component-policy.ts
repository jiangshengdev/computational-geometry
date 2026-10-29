/** Every video ESLint entry imports this policy; no toolchain dependency here. */
export const componentPolicy = {
  files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            regex: "(^|/)LessonPage(?:\\.[^/]+)?$",
            message:
              "LessonPage 已删除并禁止恢复；使用 MathLessonPage 与 TeachingMathLines。",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "Identifier[name='LessonPage']",
        message:
          "禁止重新声明或使用旧 LessonPage 组件；使用 MathLessonPage 与 TeachingMathLines。",
      },
      {
        selector:
          "ImportExpression[source.value=/LessonPage(?:\\.[^/]+)?$/]:not([source.value=/MathLessonPage/])",
        message: "禁止动态导入旧 LessonPage 组件；使用 MathLessonPage。",
      },
      {
        selector:
          "CallExpression[callee.name='require'][arguments.0.value=/LessonPage(?:\\.[^/]+)?$/]:not([arguments.0.value=/MathLessonPage/])",
        message: "禁止加载旧 LessonPage 组件；使用 MathLessonPage。",
      },
    ],
  },
};
