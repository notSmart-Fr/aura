import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";

async function runFirewall() {
  console.log("🔥 Starting AST Security Firewall Verification Sweep...");

  const project = new Project();
  
  // Explicitly add files from the storefront application
  project.addSourceFilesAtPaths("apps/storefront/app/**/*.ts");
  project.addSourceFilesAtPaths("apps/storefront/app/**/*.tsx");

  const sourceFiles = project.getSourceFiles();
  let violationCount = 0;

  console.log(`🔎 Found ${sourceFiles.length} source files to analyze.`);

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(process.cwd(), sourceFile.getFilePath());

    // 1. GraphQL Client Isolation Gate
    const imports = sourceFile.getImportDeclarations();
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      if (/\/db\/medusa/.test(moduleSpecifier)) {
        console.error(`❌ Rule 1 Isolation Gate Violation in [${relativePath}]:`);
        console.error(`   Direct Medusa database imports are forbidden. Access database via graphql-client.`);
        violationCount++;
      }
    }

    // 2. Unbound Agent Parameter Gate (Mastra Tools)
    if (sourceFile.getFilePath().includes("app/mastra/tools")) {
      const variables = sourceFile.getVariableDeclarations();
      for (const v of variables) {
        if (v.isExported()) {
          const name = v.getName();
          if (name.endsWith("Schema")) {
            const initializer = v.getInitializer();
            if (initializer) {
              const callExpressions = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
              for (const call of callExpressions) {
                const callText = call.getText();
                
                // String constraint check (.max)
                if (callText.startsWith("z.string") || callText.includes(".string(")) {
                  let current: any = call;
                  let hasMax = false;
                  while (current && current !== initializer) {
                    if (current.getKind() === SyntaxKind.CallExpression) {
                      const expr = current.getExpression();
                      if (expr.getKind() === SyntaxKind.PropertyAccessExpression && expr.getName() === "max") {
                        hasMax = true;
                        break;
                      }
                    }
                    current = current.getParent();
                  }
                  if (!hasMax) {
                    console.error(`❌ Rule 2 Unbound Parameter Violation in [${relativePath}]:`);
                    console.error(`   Exported schema variable [${name}] contains an unconstrained z.string() without .max().`);
                    violationCount++;
                  }
                }

                // Number constraint check (.min and .max)
                if (callText.startsWith("z.number") || callText.includes(".number(")) {
                  let current: any = call;
                  let hasMin = false;
                  let hasMax = false;
                  while (current && current !== initializer) {
                    if (current.getKind() === SyntaxKind.CallExpression) {
                      const expr = current.getExpression();
                      if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const propName = expr.getName();
                        if (propName === "min") hasMin = true;
                        if (propName === "max") hasMax = true;
                      }
                    }
                    current = current.getParent();
                  }
                  if (!hasMin || !hasMax) {
                    console.error(`❌ Rule 2 Unbound Parameter Violation in [${relativePath}]:`);
                    console.error(`   Exported schema variable [${name}] contains an unconstrained z.number() without .min() or .max().`);
                    violationCount++;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3. Unauthenticated Remix Action Gate
    if (sourceFile.getFilePath().includes("app/routes")) {
      const functions = sourceFile.getFunctions();
      for (const f of functions) {
        if (f.isExported() && f.getName() === "action") {
          const body = f.getBody();
          if (body) {
            const bodyText = body.getText();
            const hasSessionCheck = /authenticateUser|session|auth|x-user-role|user/.test(bodyText);
            if (!hasSessionCheck) {
              console.error(`❌ Rule 3 Unauthenticated Action Gate Violation in [${relativePath}]:`);
              console.error(`   Remix action must validate user session (e.g. call authenticateUser).`);
              violationCount++;
            }
          }
        }
      }
    }

    // 4. Webhook Signature Verification Gate
    if (sourceFile.getFilePath().endsWith("api.webhook.tsx")) {
      const fileText = sourceFile.getText();
      if (!fileText.includes("x-vendure-signature")) {
        console.error(`❌ Rule 4 Webhook Signature Gate Violation in [${relativePath}]:`);
        console.error(`   Webhook handlers must check headers for 'x-vendure-signature'.`);
        violationCount++;
      }
    }

    // 5. Mastra Workflow Concurrency Gate
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of callExpressions) {
      const text = call.getText();
      if (text.startsWith("Promise.all(") || text.includes(".Promise.all(")) {
        if (/map\([^)]*(embed|nativeGeminiClient)/i.test(text)) {
          console.error(`❌ Rule 5 Workflow Concurrency Gate Violation in [${relativePath}]:`);
          console.error(`   Unthrottled Promise.all maps calling AI embeddings / Gemini clients are prohibited.`);
          violationCount++;
        }
      }
    }

    // 6. Seamless Remix Form Validation Gate (JSX Inputs)
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
    for (const el of jsxElements) {
      if (el.getTagNameNode().getText() === "input") {
        const attributes = el.getAttributes();
        let hasOnChange = false;
        let hasDebounceOrValue = false;
        for (const attr of attributes) {
          if (attr.getKind() === SyntaxKind.JsxAttribute) {
            const name = attr.getName();
            if (name === "onChange") hasOnChange = true;
            if (/^(debounce|useDebounce|value)$/.test(name)) hasDebounceOrValue = true;
          }
        }
        if (hasOnChange && !hasDebounceOrValue) {
          console.error(`❌ Rule 6 Debounced Input Gate Violation in [${relativePath}]:`);
          console.error(`   Raw onChange listener on <input> without value/debounce controlled bindings is forbidden.`);
          violationCount++;
        }
      }
    }

    // 7. Stream Serialization Filter (Context Drift Guard)
    for (const call of callExpressions) {
      const expr = call.getExpression();
      const expText = expr.getText();
      if (expText === "streamText" || expText === "generateText" || expText.endsWith(".streamText") || expText.endsWith(".generateText")) {
        const fileText = sourceFile.getText();
        if (!fileText.includes("validateAndFilterOutput")) {
          console.error(`❌ Rule 7 Stream Serialization Gate Violation in [${relativePath}]:`);
          console.error(`   Output of streamText/generateText must be sanitized with 'validateAndFilterOutput'.`);
          violationCount++;
        }
      }
    }

    // 8. Banned Process.Env Isolation (Context Exposure Gate)
    const fileText = sourceFile.getText();
    if (/google|gemini/i.test(fileText) && /process\.env\./.test(fileText)) {
      console.error(`❌ Rule 8 Process.Env Isolation Violation in [${relativePath}]:`);
      console.error(`   Gemini-utilizing files must not read directly from process.env. Use config layers.`);
      violationCount++;
    }

    // 9. Telemetry Anonymization Gate
    for (const call of callExpressions) {
      const expText = call.getExpression().getText();
      if (/^(track|logContext|trackContext|trackEvent)$/i.test(expText)) {
        const args = call.getArguments();
        for (const arg of args) {
          const argText = arg.getText();
          if (/\.(id|_id|product_id)\b/i.test(argText)) {
            console.error(`❌ Rule 9 Telemetry Anonymization Violation in [${relativePath}]:`);
            console.error(`   Direct database identifier keys passed to telemetry function.`);
            violationCount++;
          }
        }
      }
    }

    // 10. Server-to-Client Data Serialization Gate (Spread Operators on Components)
    for (const el of jsxElements) {
      const tagName = el.getTagNameNode().getText();
      if (/^[A-Z]/.test(tagName)) {
        const attributes = el.getAttributes();
        for (const attr of attributes) {
          if (attr.getKind() === SyntaxKind.JsxSpreadAttribute) {
            console.error(`❌ Rule 10 Serialization Gate Violation in [${relativePath}]:`);
            console.error(`   Spread operators are forbidden on component tags <${tagName} /> to prevent data exposure.`);
            violationCount++;
          }
        }
      }
    }
  }

  if (violationCount > 0) {
    console.error(`\n🚨 BUILD BLOCKED: ${violationCount} structural security violations found.`);
    process.exit(1);
  } else {
    console.log("✅ Verification successful. All codebase boundaries conform to AST layout requirements.");
    process.exit(0);
  }
}

runFirewall().catch(err => {
  console.error("🔥 Error executing compiler firewall:", err);
  process.exit(1);
});
