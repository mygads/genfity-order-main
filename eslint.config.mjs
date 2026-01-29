import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Some versions of the React Hooks ecosystem add additional optional rules
      // under the `react-hooks/*` namespace. We keep the core hooks rules via
      // Next.js defaults, but disable the extra rules to avoid blocking lint on
      // existing patterns throughout the codebase.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/lib/utils/customerRoutes.ts', 'src/proxy.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^\\/customer\\//]",
          message:
            "Do not hardcode '/customer/...' routes. Use helpers from '@/lib/utils/customerRoutes' instead.",
        },
        {
          selector: "TemplateElement[value.raw=/^\\/customer\\//]",
          message:
            "Do not hardcode '/customer/...' routes. Use helpers from '@/lib/utils/customerRoutes' instead.",
        },
      ],
    },
  },
  {
    files: ['src/app/api/**/route.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSTypeAliasDeclaration[id.name='RouteContext']",
          message:
            "Do not declare RouteContext locally in API route handlers. Import type { RouteContext } from '@/lib/utils/routeContext'.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='RouteContext']",
          message:
            "Do not declare RouteContext locally in API route handlers. Import type { RouteContext } from '@/lib/utils/routeContext'.",
        },
        {
          selector: "TSTypeAliasDeclaration[id.name='NextRouteContext']",
          message:
            "Do not declare NextRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='NextRouteContext']",
          message:
            "Do not declare NextRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'.",
        },
        {
          selector: "TSTypeAliasDeclaration[id.name='NormalizedRouteContext']",
          message:
            "Do not declare NormalizedRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'.",
        },
        {
          selector: "TSInterfaceDeclaration[id.name='NormalizedRouteContext']",
          message:
            "Do not declare NormalizedRouteContext locally in API route handlers. Use the shared helpers in '@/lib/utils/routeContext'.",
        },
        {
          selector:
            "VariableDeclarator[id.type='ObjectPattern'][init.type='AwaitExpression'][init.argument.type='MemberExpression'][init.argument.property.name='params']",
          message:
            "Do not destructure directly from await context.params / routeContext.params. Use getRouteParam/require*RouteParam helpers from '@/lib/utils/routeContext' instead.",
        },
        {
          selector: "CallExpression[callee.name='BigInt'] > MemberExpression[object.name='params']",
          message:
            "Do not parse route params with BigInt(params.*). Use requireBigIntRouteParam(...) from '@/lib/utils/routeContext'.",
        },
        {
          selector:
            "CallExpression[callee.name='BigInt'] > MemberExpression[object.type='MemberExpression'][object.property.name='params']",
          message:
            "Do not parse route params with BigInt(context.params.*). Use requireBigIntRouteParam(...) from '@/lib/utils/routeContext'.",
        },
        {
          selector: "CallExpression[callee.name='parseInt'] > MemberExpression[object.name='params']",
          message:
            "Do not parse route params with parseInt(params.*). Use requireIntRouteParam(...) from '@/lib/utils/routeContext'.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Number'][callee.property.name='parseInt'] > MemberExpression[object.name='params']",
          message:
            "Do not parse route params with Number.parseInt(params.*). Use requireIntRouteParam(...) from '@/lib/utils/routeContext'.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Number'][callee.property.name='parseInt'] > MemberExpression[object.type='MemberExpression'][object.property.name='params']",
          message:
            "Do not parse route params with Number.parseInt(context.params.*). Use requireIntRouteParam(...) from '@/lib/utils/routeContext'.",
        },
      ],
    },
  },
];

export default eslintConfig;
