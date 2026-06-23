import { Project, SyntaxKind, Node } from "ts-morph";
import * as path from "path";
import { execSync } from "child_process";

import * as fs from "fs";
import chokidar from "chokidar";

function verifyDomainIsolation() {
  if (process.argv.includes("--no-isolation")) return;
  try {
    const modifiedFiles = execSync("git status --porcelain", { stdio: ["pipe", "pipe", "ignore"] }).toString();
    const domainLines = modifiedFiles
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[A-Z? ]+\s+/, ""))
      .filter(filePath => filePath.includes("apps/storefront/app/domains/"));

    const modifiedDomains = new Set<string>();
    for (const file of domainLines) {
      const parts = file.split("apps/storefront/app/domains/");
      if (parts.length > 1) {
        const subParts = parts[1].split("/");
        if (subParts.length > 0) {
          modifiedDomains.add(subParts[0]);
        }
      }
    }

    if (modifiedDomains.size > 1) {
      console.error(`❌ Domain Isolation Gate Violation:`);
      console.error(`   Agent attempted to mutate multiple distinct domains simultaneously: [${Array.from(modifiedDomains).join(", ")}]`);
      process.exit(1);
    }
  } catch (e) {
    // Skip if git check fails
  }
}

async function executeSweep(targetPath?: string): Promise<boolean> {
  verifyDomainIsolation();

  const project = new Project();
  const isChaos = process.argv.includes("--chaos");

  if (isChaos) {
    console.log("☣️ Running Chaos Test Suite Verification...");
    project.addSourceFilesAtPaths("scripts/chaos-tests/**/*.ts");
    project.addSourceFilesAtPaths("scripts/chaos-tests/**/*.tsx");
  } else if (targetPath) {
    const normPath = targetPath.replace(/\\/g, '/');
    const absoluteSinglePath = path.resolve(process.cwd(), normPath).replace(/\\/g, '/');
    if (fs.existsSync(absoluteSinglePath)) {
      const existing = project.getSourceFile(absoluteSinglePath);
      if (existing) project.removeSourceFile(existing);
      project.addSourceFileAtPath(absoluteSinglePath);
      console.log(`🔎 Target file provided: ${normPath}`);
    } else {
      console.error(`❌ Provided target file does not exist: ${normPath}`);
      return false;
    }
  } else {
    // Explicitly add files from the storefront application
    project.addSourceFilesAtPaths("apps/storefront/app/**/*.ts");
    project.addSourceFilesAtPaths("apps/storefront/app/**/*.tsx");
    project.addSourceFilesAtPaths("apps/backend/src/domains/**/*.ts");
    for (const scriptPath of ["scripts/worker.ts", "scripts/voice-agent.ts"]) {
      if (fs.existsSync(scriptPath)) {
        const existing = project.getSourceFile(path.resolve(process.cwd(), scriptPath));
        if (existing) project.removeSourceFile(existing);
        project.addSourceFileAtPath(scriptPath);
      }
    }
  }

  const sourceFiles = project.getSourceFiles();
  let violationCount = 0;
  const errors: string[] = [];
  const originalConsoleError = console.error;

  // Intercept console.error to write to .gate-results.json
  console.error = (...args: any[]) => {
    errors.push(args.map(a => String(a)).join(" "));
    originalConsoleError(...args);
  };

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
    if (sourceFile.getFilePath().includes("app/domains") && sourceFile.getFilePath().endsWith("Tool.ts")) {
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
                if (call.getExpression().getText() === "z.string") {
                  let current: any = call;
                  let hasMax = false;
                  while (current && current !== initializer) {
                    if (current.getKind() === SyntaxKind.CallExpression) {
                      const expr = current.getExpression();
                      if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const propName = expr.getName();
                        if (propName === "max" || propName === "uuid") {
                          hasMax = true;
                          break;
                        }
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
                if (call.getExpression().getText() === "z.number") {
                  let current: any = call;
                  let hasMin = false;
                  let hasMax = false;
                  while (current && current !== initializer) {
                    if (current.getKind() === SyntaxKind.CallExpression) {
                      const expr = current.getExpression();
                      if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const propName = expr.getName();
                        if (propName === "min" || propName === "positive" || propName === "nonnegative") hasMin = true;
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

    if (sourceFile.getFilePath().endsWith("api.webhook.whatsapp.ts")) {
      const fileText = sourceFile.getText();
      const hasZodParse = /\.parse\(|\.safeParse\(/.test(fileText);
      const hasQueueAdd = /ingestionQueue\.add/.test(fileText);
      if (!hasZodParse || !hasQueueAdd) {
        console.error(`❌ WhatsApp Webhook Schema Gate Violation in [${relativePath}]:`);
        console.error(`   WhatsApp webhook route must parse the payload using Zod before queue dispatching.`);
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
          if (Node.isJsxAttribute(attr)) {
            const name = attr.getNameNode().getText();
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

    // 11. Model Constraint Check (AI Model Gate)
    const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
    for (const ne of newExpressions) {
      if (ne.getExpression().getText() === "Agent") {
        const args = ne.getArguments();
        if (args[0] && Node.isObjectLiteralExpression(args[0])) {
          const modelProp = args[0].getProperty("model");
          if (modelProp && Node.isPropertyAssignment(modelProp)) {
            const val = modelProp.getInitializer()?.getText();
            const allowedModels = ["'google/gemini-2.0-flash'", "'google/gemini-2.5-flash'", "'deepseek-chat'", "'deepseek/deepseek-chat'", "deepseek('deepseek-chat')"];
            if (!allowedModels.includes(val || "")) {
              console.error(`❌ Rule 11 Model Constraint Gate Violation in [${relativePath}]:`);
              console.error(`   Unauthorized Model Choice [${val}]. Only gemini-2.0-flash or gemini-2.5-flash are allowed.`);
              violationCount++;
            }
          }
        }
      }
    }

    // 12. Pragmatic Tool Contract Gate
    for (const call of callExpressions) {
      if (call.getExpression().getText() === "createTool") {
        const args = call.getArguments();
        if (args[0] && Node.isObjectLiteralExpression(args[0])) {
          // Check tool id
          const idProp = args[0].getProperty("id");
          if (idProp && Node.isPropertyAssignment(idProp)) {
            const idVal = idProp.getInitializer()?.getText()?.replace(/['"`]/g, "") || "";
            const isValidSlug = /^[a-zA-Z0-9-_]+$/.test(idVal);
            if (!isValidSlug) {
              console.error(`❌ Rule 12 Tool Contract Gate Violation in [${relativePath}]:`);
              console.error(`   Tool ID [${idVal}] must match a valid alphanumeric slug pattern.`);
              violationCount++;
            }
          }

          // Check tool description
          const descProp = args[0].getProperty("description");
          if (descProp && Node.isPropertyAssignment(descProp)) {
            const descVal = descProp.getInitializer()?.getText()?.replace(/['"`]/g, "") || "";
            if (descVal.length < 20) {
              console.error(`❌ Rule 12 Tool Contract Gate Violation in [${relativePath}]:`);
              console.error(`   Tool description is too short (${descVal.length} chars). Must be at least 20 characters.`);
              violationCount++;
            }
          } else {
            console.error(`❌ Rule 12 Tool Contract Gate Violation in [${relativePath}]:`);
            console.error(`   Tool is missing a description property.`);
            violationCount++;
          }
        }
      }
    }

    // 13. E-commerce Idempotency and Bounds Gate
    if (sourceFile.getFilePath().includes("app/domains") && sourceFile.getFilePath().endsWith("Tool.ts")) {
      const isCartOrCheckout = sourceFile.getFilePath().includes("app/domains/cart/") || sourceFile.getFilePath().includes("app/domains/checkout/");
      if (isCartOrCheckout) {
        const variables = sourceFile.getVariableDeclarations();
        for (const v of variables) {
          if (v.isExported()) {
            const name = v.getName();
            if (name.endsWith("Schema")) {
              const initializer = v.getInitializer();
              if (initializer) {
                const objectCalls = initializer.getDescendantsOfKind(SyntaxKind.CallExpression).filter(call => {
                  return call.getExpression().getText() === "z.object";
                });

                for (const objCall of objectCalls) {
                  const args = objCall.getArguments();
                  if (args[0] && Node.isObjectLiteralExpression(args[0])) {
                    const objLiteral = args[0];
                    const properties = objLiteral.getProperties();
                    let hasIdempotencyKey = false;

                    for (const prop of properties) {
                      if (Node.isPropertyAssignment(prop)) {
                        const propName = prop.getName();
                        const propInit = prop.getInitializer();

                        // Rule A: Idempotency Key Validation
                        if (propName === "idempotencyKey") {
                          const chainText = propInit?.getText() || "";
                          const hasZodString = chainText.includes("z.string");
                          const hasUuid = chainText.includes(".uuid");
                          if (hasZodString && hasUuid) {
                            hasIdempotencyKey = true;
                          }
                        }

                        // Rule B: Quantity Bounds and Integer Enforce
                        if (/quantity|qty/i.test(propName)) {
                          const propInitText = propInit?.getText() || "";
                          if (propInitText.includes("z.number") || propInitText.includes("z.integer")) {
                            const propAccesses = propInit?.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression) || [];
                            const methodNames = propAccesses.map(pa => pa.getName());
                            const hasInt = methodNames.includes("int") || methodNames.includes("integer");
                            const hasPositive = methodNames.includes("positive");

                            const hasMax99 = propAccesses.some(pa => {
                              if (pa.getName() === "max") {
                                const call = pa.getParentIfKind(SyntaxKind.CallExpression);
                                if (call) {
                                  const callArgs = call.getArguments();
                                  return callArgs[0]?.getText() === "99";
                                }
                              }
                              return false;
                            });

                            if (!hasInt || !hasPositive) {
                              console.error(`❌ Rule 13 Quantity Constraint Violation in [${relativePath}]:`);
                              console.error(`   Quantity property [${propName}] in [${name}] must enforce integer and positive constraints using .int().positive().`);
                              violationCount++;
                            }
                            if (!hasMax99) {
                              console.error(`❌ Rule 13 Quantity Constraint Violation in [${relativePath}]:`);
                              console.error(`   Quantity property [${propName}] in [${name}] must enforce an upper limit of 99 using .max(99).`);
                              violationCount++;
                            }
                          }
                        }

                        // Rule C: Client-Side Price Tampering Vector Prevention
                        if (/price|amount/i.test(propName)) {
                          console.error(`❌ Rule 13 Price Tampering Violation in [${relativePath}]:`);
                          console.error(`   Price/amount property [${propName}] in [${name}] is forbidden. Prices must only be resolved backend-side.`);
                          violationCount++;
                        }
                      }
                    }

                    if (!hasIdempotencyKey) {
                      console.error(`❌ Rule 13 Idempotency Violation in [${relativePath}]:`);
                      console.error(`   Cart/checkout tool input schema [${name}] is missing an 'idempotencyKey' validation of type z.string().uuid().`);
                      violationCount++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 14. Storefront Network Isolation Gate
    for (const call of callExpressions) {
      const expText = call.getExpression().getText();
      const isFetch = expText === "fetch" || expText.endsWith(".fetch");
      const isAxios = expText === "axios" || expText.startsWith("axios.") || expText.includes(".axios");

      if (isFetch || isAxios) {
        // A. Verify they are nested within a Zod .parse() node
        let currentParent: Node | undefined = call.getParent();
        let isParsed = false;
        while (currentParent) {
          if (Node.isCallExpression(currentParent)) {
            const parentExpr = currentParent.getExpression();
            if (Node.isPropertyAccessExpression(parentExpr)) {
              const propName = parentExpr.getName();
              if (propName === "parse" || propName === "parseAsync" || propName === "safeParse") {
                isParsed = true;
                break;
              }
            }
          }
          currentParent = currentParent.getParent();
        }

        if (!isParsed) {
          console.error(`❌ Rule 14 Network Isolation Gate Violation in [${relativePath}]:`);
          console.error(`   Network call [${call.getText().substring(0, 40)}...] is not nested within a Zod parse node.`);
          violationCount++;
        }

        // B. Verify that mutating requests pass an Idempotency-Key header literal.
        let isMutating = false;
        let configExpr: Node | undefined;

        if (isFetch) {
          // fetch(url, options) -> options is the second argument
          const args = call.getArguments();
          if (args.length >= 2) {
            configExpr = args[1];
          }
        } else {
          // axios.post(url, data, config) -> index 2
          // axios.put(...) -> index 2
          // axios.patch(...) -> index 2
          // axios.delete(url, config) -> index 1
          // axios(config) -> index 0
          if (expText.endsWith(".post") || expText.endsWith(".put") || expText.endsWith(".patch")) {
            isMutating = true;
            const args = call.getArguments();
            if (args.length >= 3) {
              configExpr = args[2];
            }
          } else if (expText.endsWith(".delete")) {
            isMutating = true;
            const args = call.getArguments();
            if (args.length >= 2) {
              configExpr = args[1];
            }
          } else if (expText === "axios" || expText.endsWith(".request")) {
            const args = call.getArguments();
            if (args.length >= 1) {
              configExpr = args[0];
            }
          }
        }

        // Determine mutation from config/options method property
        if (configExpr) {
          let literalObj: Node | undefined;
          if (Node.isObjectLiteralExpression(configExpr)) {
            literalObj = configExpr;
          } else if (Node.isIdentifier(configExpr)) {
            const declarations = configExpr.getSymbol()?.getDeclarations() || [];
            for (const def of declarations) {
              if (Node.isVariableDeclaration(def)) {
                const init = def.getInitializer();
                if (init && Node.isObjectLiteralExpression(init)) {
                  literalObj = init;
                  break;
                }
              }
            }
          }

          if (literalObj && Node.isObjectLiteralExpression(literalObj)) {
            const methodProp = literalObj.getProperty("method");
            if (methodProp && Node.isPropertyAssignment(methodProp)) {
              const methodVal = methodProp.getInitializer()?.getText()?.replace(/['"`]/g, "")?.toUpperCase();
              if (methodVal && ["POST", "PUT", "PATCH", "DELETE"].includes(methodVal)) {
                // If it is a GraphQL request, check if it contains a mutation
                let isGraphQLMutation = false;
                const bodyProp = literalObj.getProperty("body");
                if (bodyProp && Node.isPropertyAssignment(bodyProp)) {
                  const bodyInitText = bodyProp.getInitializer()?.getText() || "";
                  if (bodyInitText.includes("query") || bodyInitText.includes("mutation")) {
                    if (bodyInitText.includes("mutation") || bodyInitText.includes("mutation ")) {
                      isGraphQLMutation = true;
                    }
                  } else {
                    isGraphQLMutation = true;
                  }
                } else {
                  isGraphQLMutation = true;
                }

                if (methodVal === "POST" && !isGraphQLMutation) {
                  isMutating = false;
                } else {
                  isMutating = true;
                }
              }
            }

            if (isMutating) {
              const headersProp = literalObj.getProperty("headers");
              let hasIdempotencyKey = false;
              if (headersProp && Node.isPropertyAssignment(headersProp)) {
                const headersInit = headersProp.getInitializer();
                let headersLiteral: Node | undefined;
                if (headersInit && Node.isObjectLiteralExpression(headersInit)) {
                  headersLiteral = headersInit;
                } else if (headersInit && Node.isIdentifier(headersInit)) {
                  const declarations = headersInit.getSymbol()?.getDeclarations() || [];
                  for (const def of declarations) {
                    if (Node.isVariableDeclaration(def)) {
                      const init = def.getInitializer();
                      if (init && Node.isObjectLiteralExpression(init)) {
                        headersLiteral = init;
                        break;
                      }
                    }
                  }
                }

                if (headersLiteral && Node.isObjectLiteralExpression(headersLiteral)) {
                  const properties = headersLiteral.getProperties();
                  for (const prop of properties) {
                    if (Node.isPropertyAssignment(prop)) {
                      const propName = prop.getName().replace(/['"`]/g, "").toLowerCase();
                      if (propName === "idempotency-key") {
                        hasIdempotencyKey = true;
                        break;
                      }
                    }
                  }
                }
              }

              if (!hasIdempotencyKey) {
                console.error(`❌ Rule 14 Network Isolation Gate Violation in [${relativePath}]:`);
                console.error(`   Mutating network request [${call.getText().substring(0, 40)}...] is missing 'Idempotency-Key' in headers.`);
                violationCount++;
              }
            }
          }
        } else if (isMutating) {
          console.error(`❌ Rule 14 Network Isolation Gate Violation in [${relativePath}]:`);
          console.error(`   Mutating network request [${call.getText().substring(0, 40)}...] must provide a config object passing 'Idempotency-Key' in headers.`);
          violationCount++;
        }
      }
    }

    // 15. Ingestion Worker Normalization Gate (scripts/worker.ts)
    if (relativePath.replace(/\\/g, "/") === "scripts/worker.ts") {
      const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of callExpressions) {
        const exprText = call.getExpression().getText();
        if (exprText === "processNormalizedPayload") {
          const args = call.getArguments();
          for (const arg of args) {
            const argType = arg.getType().getText();
            if (!argType.includes("NormalizedPayload")) {
              console.error(`❌ Rule 15 Normalization Gate Violation in [${relativePath}]:`);
              console.error(`   Variable [${arg.getText()}] passed to downstream controller [${exprText}] is not bound to a strict 'NormalizedPayload' type.`);
              violationCount++;
            }
          }
        }
      }
    }

    // 16. Cosine Similarity Operator Gate (Semantic Cache DB queries)
    if (sourceFile.getFilePath().replace(/\\/g, "/").includes("apps/storefront/app/domains/ai-cache")) {
      const fileText = sourceFile.getText();
      if (fileText.includes("cache_embeddings")) {
        const stringsAndTemplates = [
          ...sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral),
          ...sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral),
          ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression),
          ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateHead),
          ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateMiddle),
          ...sourceFile.getDescendantsOfKind(SyntaxKind.TemplateTail)
        ];
        
        let hasCacheQuery = false;
        let hasCosineOperator = false;
        
        for (const node of stringsAndTemplates) {
          const text = node.getText();
          if (text.includes("cache_embeddings")) {
            hasCacheQuery = true;
            if (text.includes("<=>")) {
              hasCosineOperator = true;
            }
          }
        }
        
        if (hasCacheQuery && !hasCosineOperator) {
          console.error(`❌ Rule 16 Cosine Similarity Gate Violation in [${relativePath}]:`);
          console.error(`   Queries targeting 'cache_embeddings' must execute native distance matching via '<=>'.`);
          violationCount++;
        }
      }
    }

    // 17. Context-Window Prompt Suffix Optimization Gate
    if (sourceFile.getFilePath().replace(/\\/g, "/").includes("apps/storefront/app/domains/ai-agents")) {
      const templates = sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression);
      for (const template of templates) {
        const text = template.getText();
        if (/text|payload/i.test(text)) {
          const spans = template.getTemplateSpans();
          if (spans.length > 0) {
            const lastSpan = spans[spans.length - 1];
            const lastSpanExpr = lastSpan.getExpression().getText();
            const lastSpanLiteral = lastSpan.getLiteral().getText().replace(/^[}\s]+|[\\'"\s`]+$/g, "").trim();
            
            let invalidIndex = false;
            for (let i = 0; i < spans.length - 1; i++) {
              if (/text|payload/i.test(spans[i].getExpression().getText())) {
                invalidIndex = true;
              }
            }
            
            if (invalidIndex || lastSpanLiteral.length > 0 || !/text|payload/i.test(lastSpanExpr)) {
              console.error(`❌ Rule 17 Context-Window Optimization Gate Violation in [${relativePath}]:`);
              console.error(`   Dynamic user text variables (like payload.text) must be appended at the absolute suffix of the prompt template (last expression with no trailing text).`);
              violationCount++;
            }
          }
        }
      }
      
      const binaryExprs = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
      for (const bin of binaryExprs) {
        if (bin.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
          const leftText = bin.getLeft().getText();
          const rightText = bin.getRight().getText();
          if (/text|payload/i.test(leftText) && !/text|payload/i.test(rightText)) {
            console.error(`❌ Rule 17 Context-Window Optimization Gate Violation in [${relativePath}]:`);
            console.error(`   Dynamic user text variables (like payload.text) must not be prepended before static prompt strings.`);
            violationCount++;
          }
        }
      }
    }

    // 18. Telemetry Data Leakage Prevention Gate (scripts/worker.ts)
    if (relativePath.replace(/\\/g, "/") === "scripts/worker.ts") {
      for (const call of callExpressions) {
        const propAccess = call.getExpression();
        if (Node.isPropertyAccessExpression(propAccess)) {
          const propName = propAccess.getName();
          if (propName === "setAttribute") {
            const args = call.getArguments();
            if (args.length > 0) {
              const keyVal = args[0].getText().toLowerCase().replace(/['"`]/g, "");
              if (/(phone|sender|text|message)/.test(keyVal)) {
                console.error(`❌ Rule 18 Telemetry Data Leakage Prevention Gate Violation in [${relativePath}]:`);
                console.error(`   Forbidden attribute key [${keyVal}] containing sensitive info was used on OpenTelemetry span.`);
                violationCount++;
              }
            }
          }
        }
      }
    }

    // 19. Explicit Any Prevention Gate
    const paramsAndVars = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.Parameter),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    ];
    for (const node of paramsAndVars) {
      const typeNode = node.getTypeNode();
      if (typeNode && typeNode.getKind() === SyntaxKind.AnyKeyword) {
        console.error(`❌ Rule 19 Explicit Any Gate Violation in [${relativePath}]:`);
        console.error(`   Explicit 'any' type override discovered on variable/parameter "${node.getName()}". Type safety is mandatory.`);
        violationCount++;
      }
    }

    // 20. Anti-Cheat: z.any().parse() Prevention Gate
    for (const call of callExpressions) {
      if (isZodAnyParseCheat(call)) {
        const lineNumber = call.getStartLineNumber();
        console.error(`❌ Rule 20 Anti-Cheat Violation in [${relativePath}]: Line ${lineNumber}`);
        console.error(`   Discovered 'z.any().parse()' network gate bypass shortcut.`);
        console.error(`   Explicit structural schema validation is strictly mandatory for isolation boundaries.`);
        violationCount++;
      }
    }

    // 21. Explicit Catch-Block Type-Guarding
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
    for (const catchClause of catchClauses) {
      const variableDecl = catchClause.getVariableDeclaration();

      if (variableDecl) {
        const varName = variableDecl.getName();
        const typeNode = variableDecl.getTypeNode();

        // Check 1: Must be explicitly typed as 'unknown'
        if (!typeNode || typeNode.getKind() !== SyntaxKind.UnknownKeyword) {
          console.error(`❌ Rule 21 Catch-Block Type Gate Violation in [${relativePath}]:`);
          console.error(`   Catch variable [${varName}] must be explicitly typed as ': unknown'.`);
          violationCount++;
        }

        // Check 2: First statement must be type-guard if variable has unsafe property access
        const block = catchClause.getBlock();
        const statements = block.getStatements();

        // Rule E2: Empty catch blocks are forbidden
        if (statements.length === 0) {
          console.error(`❌ Rule E2 Empty Catch Gate Violation in [${relativePath}]:`);
          console.error(`   Catch block for [${varName}] must log, trace, or re-throw — silent suppression is forbidden.`);
          violationCount++;
        }

        if (statements.length > 0) {
          const firstStmt = statements[0];
          const blockText = block.getText();

          // Rule E1: Ban lazy 'as any' casts inside catch blocks
          const lazyAnyCast = new RegExp(`\\(\\s*${varName}\\s+as\\s+any\\s*\\)|<\\s*any\\s*>\\s*${varName}\\b`).test(blockText);
          if (lazyAnyCast) {
            console.error(`❌ Rule E1 Lazy Catch Cast Gate Violation in [${relativePath}]:`);
            console.error(`   Catch variable [${varName}] must not be cast with 'as any'.`);
            violationCount++;
          }

          // Rule E1: .message access requires instanceof Error or domain error guard
          const hasMessageAccess = new RegExp(`\\b${varName}\\.message\\b`).test(blockText);
          const hasSafeGuard = new RegExp(
            `${varName}\\s+instanceof\\s+(Error|IntegrationError|DatabaseDomainError)`
          ).test(blockText);
          if (hasMessageAccess && !hasSafeGuard) {
            console.error(`❌ Rule E1 Catch Message Access Gate Violation in [${relativePath}]:`);
            console.error(`   Catch block accessing [${varName}.message] must guard with instanceof Error or a domain error class.`);
            violationCount++;
          }

          // Verify if the variable is used for UNSAFE property access (dot or bracket notation)
          const hasPropertyAccess = new RegExp(`\\b${varName}\\.\\w+|\\b${varName}\\[`).test(blockText);

          if (hasPropertyAccess) {
            const firstStmtText = firstStmt.getText();
            const hasTypeGuard = /instanceof\s+Error/.test(firstStmtText);

            if (!hasTypeGuard) {
              console.error(`❌ Rule 21 Catch-Block Type-Guard Violation in [${relativePath}]:`);
              console.error(`   Catch block reading properties of [${varName}] must execute a type-guard check first.`);
              violationCount++;
            }
          }
        }
      }
    }

    // Rule E3: PII leak prevention in error metadata and console.error calls
    const piiKeyPattern = /phone|email|transcript|text/i;
    const domainErrorNames = new Set(["IntegrationError", "DatabaseDomainError"]);

    for (const ne of newExpressions) {
      const ctorName = ne.getExpression().getText();
      if (!domainErrorNames.has(ctorName)) continue;

      const args = ne.getArguments();
      if (args.length < 3) continue;

      const metaArg = args[2];
      if (!Node.isObjectLiteralExpression(metaArg)) continue;

      for (const prop of metaArg.getProperties()) {
        if (!Node.isPropertyAssignment(prop) && !Node.isShorthandPropertyAssignment(prop)) continue;
        const propName = Node.isPropertyAssignment(prop)
          ? prop.getName()
          : prop.getName();
        if (piiKeyPattern.test(propName)) {
          console.error(`❌ Rule E3 Error Metadata PII Gate Violation in [${relativePath}]:`);
          console.error(`   Domain error metadata key [${propName}] may contain raw PII — use structural attributes only.`);
          violationCount++;
        }
      }
    }

    for (const call of callExpressions) {
      if (call.getExpression().getText() !== "console.error") continue;

      for (const arg of call.getArguments()) {
        if (!Node.isIdentifier(arg)) continue;
        if (piiKeyPattern.test(arg.getText())) {
          console.error(`❌ Rule E3 Console Error PII Gate Violation in [${relativePath}]:`);
          console.error(`   console.error must not pass unvetted PII identifier [${arg.getText()}].`);
          violationCount++;
        }
      }
    }
  }


  // Restore console.error
  console.error = originalConsoleError;

  const passed = violationCount === 0;
  fs.writeFileSync(".gate-results.json", JSON.stringify({
    passed,
    errors: passed ? null : errors,
    timestamp: Date.now()
  }, null, 2));

  if (!passed) {
    console.error(`\n🚨 BUILD BLOCKED: ${violationCount} structural security violations found.`);
  } else {
    console.log("✅ Verification successful. All codebase boundaries conform to AST layout requirements.");
  }
  return passed;
}

function isZodAnyParseCheat(node: any): boolean {
  const expression = node.getExpression();
  if (!Node.isPropertyAccessExpression(expression)) return false;

  // Checks if the method being called is ".parse(...)"
  if (expression.getName() !== "parse") return false;

  // Travels up the chain to see if the caller was "z.any()"
  const subExpression = expression.getExpression();
  if (!Node.isCallExpression(subExpression)) return false;

  const anyAccess = subExpression.getExpression();
  if (!Node.isPropertyAccessExpression(anyAccess)) return false;

  // Verifies the exact chain signature: z -> any
  return anyAccess.getExpression().getText() === "z" && anyAccess.getName() === "any";
}

const gateResultsPath = path.join(process.cwd(), ".gate-results.json");

function flushGateState() {
  console.log("\n🧹 Cleaning up verification metrics...");
  try {
    if (fs.existsSync(gateResultsPath)) {
      fs.writeFileSync(gateResultsPath, JSON.stringify({ passed: false, status: "stale_or_terminated" }, null, 2));
      console.log("🗑️ Stale .gate-results.json state successfully wiped clean.");
    }
  } catch (error) {
    console.error("⚠️ Failed to safely flush compiler gate logs:", error);
  }
}

process.on("SIGINT", () => {
  flushGateState();
  process.exit(0);
});

process.on("SIGTERM", () => {
  flushGateState();
  process.exit(0);
});

async function main() {
  const isWatch = process.argv.includes("--watch");

  if (isWatch) {
    console.log("🔥 Starting AST Security Firewall Watcher...");

    // Initial full sweep on startup
    await executeSweep();

    const watcher = chokidar.watch(["apps/storefront/app/domains/**/*.ts*", "scripts/worker.ts", "scripts/voice-agent.ts", "apps/backend/src/domains/**/*.ts"], {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("add", async (filePath: string) => {
      console.log(`\n🔎 File added: ${filePath}`);
      await executeSweep(filePath);
    });

    watcher.on("change", async (filePath: string) => {
      console.log(`\n🔎 File changed: ${filePath}`);
      await executeSweep(filePath);
    });

    watcher.on("unlink", async (filePath: string) => {
      console.log(`\n🔎 File removed: ${filePath}`);
      await executeSweep();
    });
  } else {
    console.log("🔥 Starting AST Security Firewall Verification Sweep...");
    const rawTargetPath = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
    const passed = await executeSweep(rawTargetPath);
    if (!passed) {
      process.exit(1);
    }
    process.exit(0);
  }
}

main().catch(err => {
  console.error("🔥 Error executing compiler firewall:", err);
  process.exit(1);
});

