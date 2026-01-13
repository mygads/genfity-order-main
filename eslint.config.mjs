import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Changed from error to warning
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "import/no-anonymous-default-export": "warn"
    }
  },
  {
    files: ["src/app/api/**/route.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSTypeAliasDeclaration[id.name='RouteContext']",
          message: "Do not declare RouteContext locally in API route handlers. Import type { RouteContext } from '@/lib/utils/routeContext'."
        },
        {
          selector: "TSInterfaceDeclaration[id.name='RouteContext']",
          message: "Do not declare RouteContext locally in API route handlers. Import type { RouteContext } from '@/lib/utils/routeContext'."
        },
        {
          selector: "TSTypeAliasDeclaration[id.name='NextRouteContext']",
          message: "Do not declare NextRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'."
        },
        {
          selector: "TSInterfaceDeclaration[id.name='NextRouteContext']",
          message: "Do not declare NextRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'."
        },
        {
          selector: "TSTypeAliasDeclaration[id.name='NormalizedRouteContext']",
          message: "Do not declare NormalizedRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'."
        },
        {
          selector: "TSInterfaceDeclaration[id.name='NormalizedRouteContext']",
          message: "Do not declare NormalizedRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'."
        }
      ]
    }
  }
];

export default eslintConfig;
