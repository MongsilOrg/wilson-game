import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
  },
  ...next,
  {
    rules: {
      // 마운트 후 클라이언트 전용 값(테마, 볼륨)을 채우는 패턴이라 의도적이다.
      // 규칙을 끄지 않고 경고로 남겨 새로 생기는 위반을 볼 수 있게 둔다.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
