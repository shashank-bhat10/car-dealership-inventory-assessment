import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = path.resolve(frontendDirectory, "..");
const screenshotDirectory = path.join(repositoryDirectory, "screenshots");
const port = Number(process.env.RESPONSIVE_AUDIT_PORT ?? 5177);
const baseUrl = `http://127.0.0.1:${port}`;
const viewports = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
const screenshotsRequested = process.argv.includes("--screenshots");
const failures = [];
let server;
let browser;

function recordFailure(viewport, screen, message) {
  failures.push(`${viewport.width}x${viewport.height} ${screen}: ${message}`);
}

async function waitForVite() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await delay(250);
  }
  throw new Error(`Vite did not become ready at ${baseUrl}`);
}

async function installApiMock(page) {
  let inventory = [
    { id: 1, make: "Volvo", model: "XC60", category: "SUV", price: "48900.00", quantity: 2 },
  ];
  let nextId = 2;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = {};
    try {
      body = request.postDataJSON() ?? {};
    } catch {
      // Login uses form encoding rather than JSON.
    }
    if (url.pathname === "/api/auth/login") {
      const credentials = new URLSearchParams(request.postData() ?? "");
      const isAdmin = credentials.get("username") === "admin@example.com";
      await route.fulfill({
        json: { access_token: isAdmin ? "admin-token" : "customer-token", token_type: "bearer", is_admin: isAdmin },
      });
      return;
    }
    if (url.pathname === "/api/auth/register") {
      await route.fulfill({ status: 201, json: { id: 2, email: body.email, is_admin: false } });
      return;
    }
    if (url.pathname === "/api/vehicles" && request.method() === "GET") {
      await route.fulfill({ json: inventory });
      return;
    }
    if (url.pathname === "/api/vehicles" && request.method() === "POST") {
      const created = { ...body, id: nextId++ };
      inventory = [...inventory, created];
      await route.fulfill({ status: 201, json: created });
      return;
    }
    const vehiclePath = url.pathname.match(/^\/api\/vehicles\/(\d+)(?:\/(restock|purchase))?$/);
    if (!vehiclePath) {
      await route.fulfill({ status: 404, json: { detail: "Not found" } });
      return;
    }
    const vehicleId = Number(vehiclePath[1]);
    const action = vehiclePath[2];
    const vehicleIndex = inventory.findIndex((vehicle) => vehicle.id === vehicleId);
    if (vehicleIndex < 0) {
      await route.fulfill({ status: 404, json: { detail: "Vehicle not found" } });
      return;
    }
    if (request.method() === "GET") {
      await route.fulfill({ json: inventory[vehicleIndex] });
    } else if (request.method() === "PUT") {
      inventory[vehicleIndex] = { ...body, id: vehicleId };
      await route.fulfill({ json: inventory[vehicleIndex] });
    } else if (request.method() === "DELETE") {
      inventory = inventory.filter((vehicle) => vehicle.id !== vehicleId);
      await route.fulfill({ status: 204, body: "" });
    } else if (action === "restock") {
      inventory[vehicleIndex].quantity += body.quantity;
      await route.fulfill({ json: inventory[vehicleIndex] });
    } else if (action === "purchase") {
      inventory[vehicleIndex].quantity -= 1;
      await route.fulfill({ json: inventory[vehicleIndex] });
    } else {
      await route.fulfill({ status: 404, json: { detail: "Not found" } });
    }
  });
}

async function assertNoHorizontalOverflow(page, viewport, screen) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    overflowingElements: [...document.querySelectorAll("body *")]
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > document.documentElement.clientWidth + 1)
      .slice(0, 5)
      .map(({ element, rect }) => `${element.tagName.toLowerCase()}.${String(element.className?.baseVal ?? element.className ?? "").replaceAll(" ", ".")} right=${Math.round(rect.right)}`),
  }));
  if (dimensions.document > dimensions.viewport || dimensions.body > dimensions.viewport) {
    recordFailure(viewport, screen, `horizontal overflow (viewport ${dimensions.viewport}px, document ${dimensions.document}px, body ${dimensions.body}px; elements: ${dimensions.overflowingElements.join(", ")})`);
  }
}

async function assertLabeledControls(page, viewport, screen) {
  const unlabeledInputs = await page.locator("input").evaluateAll((inputs) => inputs
    .filter((input) => !input.labels?.length && !input.getAttribute("aria-label") && !input.getAttribute("aria-labelledby"))
    .map((input) => input.outerHTML));
  const unnamedButtons = await page.getByRole("button").evaluateAll((buttons) => buttons
    .filter((button) => !button.innerText.trim() && !button.getAttribute("aria-label") && !button.getAttribute("aria-labelledby"))
    .map((button) => button.outerHTML));
  const undersizedControls = await page.locator("input, button, a[href]").evaluateAll((controls) => controls
    .filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && (rect.width < 24 || rect.height < 24);
    })
    .map((control) => `${control.tagName.toLowerCase()} ${control.innerText.trim() || control.getAttribute("aria-label") || control.getAttribute("type")}: ${Math.round(control.getBoundingClientRect().width)}x${Math.round(control.getBoundingClientRect().height)}`));
  if (unlabeledInputs.length) recordFailure(viewport, screen, `unlabeled inputs: ${unlabeledInputs.join(", ")}`);
  if (unnamedButtons.length) recordFailure(viewport, screen, `unnamed buttons: ${unnamedButtons.join(", ")}`);
  if (undersizedControls.length) recordFailure(viewport, screen, `controls smaller than 24 CSS px: ${undersizedControls.join("; ")}`);
}

async function assertKeyboardFocus(page, viewport, screen) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = element && getComputedStyle(element);
    const rect = element?.getBoundingClientRect();
    return {
      tag: element?.tagName,
      label: element?.innerText?.trim() || element?.getAttribute("aria-label") || element?.getAttribute("type"),
      outlineStyle: style?.outlineStyle,
      outlineWidth: Number.parseFloat(style?.outlineWidth ?? "0"),
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
    };
  });
  if (!focus.tag || focus.outlineStyle === "none" || focus.outlineWidth < 2 || !focus.width || !focus.height) {
    recordFailure(viewport, screen, `keyboard focus is not clearly visible on first Tab (${JSON.stringify(focus)})`);
  }
}

async function assertNoAxeViolations(page, viewport, screen) {
  await page.addScriptTag({ path: path.join(frontendDirectory, "node_modules", "axe-core", "axe.min.js") });
  const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
  for (const violation of results.violations) {
    const nodes = violation.nodes.map((node) => `${node.target.join(" ")}: ${node.any.map((check) => check.message).join(" ")}`).join("; ");
    recordFailure(viewport, screen, `axe ${violation.id} (${violation.impact}): ${nodes}`);
  }
}

async function assertDetailsHeaderSpacing(page, viewport, screen) {
  if (!screen.includes("details")) return;
  const spacing = await page.evaluate(() => {
    const back = document.querySelector(".vehicle-page .back-link")?.getBoundingClientRect();
    const eyebrow = document.querySelector(".vehicle-page > .eyebrow")?.getBoundingClientRect();
    return back && eyebrow ? eyebrow.top - back.bottom : null;
  });
  if (spacing === null || spacing < 8) recordFailure(viewport, screen, `vehicle details label overlaps or crowds back navigation (spacing ${spacing}px)`);
}

async function auditScreen(page, viewport, screen, captureName) {
  await assertNoHorizontalOverflow(page, viewport, screen);
  await assertLabeledControls(page, viewport, screen);
  await assertKeyboardFocus(page, viewport, screen);
  await assertNoAxeViolations(page, viewport, screen);
  await assertDetailsHeaderSpacing(page, viewport, screen);
  const isMobileCustomerScreen = viewport.width === 375 && screen === "customer inventory";
  const isMobileDetailsScreen = viewport.width === 375 && screen === "vehicle details";
  const isDesktopScreenshot = viewport.width === 1440 && captureName;
  if (screenshotsRequested && (isDesktopScreenshot || isMobileCustomerScreen || isMobileDetailsScreen)) {
    const screenshotName = isMobileCustomerScreen ? "customer-inventory-mobile.png" : isMobileDetailsScreen ? "vehicle-details-mobile.png" : captureName;
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: path.join(screenshotDirectory, screenshotName), fullPage: true });
  }
}

async function signIn(page, email) {
  await page.goto(baseUrl);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("Safe-Drive-2046");
  await page.getByLabel("Password").press("Enter");
  await page.getByRole("heading", { name: "Available vehicles" }).waitFor();
  await page.getByRole("heading", { name: "Volvo XC60" }).waitFor();
}

async function runViewport(viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await installApiMock(page);

  await page.goto(baseUrl);
  await page.getByRole("heading", { name: "Find your next drive." }).waitFor();
  await auditScreen(page, viewport, "sign-in", "sign-in.png");
  await page.getByLabel("Email address").fill("customer@example.com");
  await page.getByLabel("Password").fill("Safe-Drive-2046");
  await page.getByLabel("Password").press("Enter");
  await page.getByRole("heading", { name: "Volvo XC60" }).waitFor();

  await auditScreen(page, viewport, "customer inventory", "customer-inventory.png");
  await page.getByLabel("Make").fill("Volvo");
  await page.getByRole("button", { name: "Search inventory" }).click();
  await page.getByRole("button", { name: "Purchase" }).click();
  const purchaseDialog = page.getByRole("alertdialog");
  await purchaseDialog.waitFor({ state: "visible" });
  if (!(await purchaseDialog.innerText()).includes("does not process payment")) recordFailure(viewport, "customer inventory", "purchase confirmation omitted the simulated-purchase notice");
  await page.getByRole("button", { name: "Confirm purchase" }).click();
  await page.getByText("1 in stock").waitFor();
  await page.getByRole("link", { name: "Volvo XC60" }).click();
  await page.getByRole("heading", { name: "Volvo XC60" }).waitFor();
  await page.getByText("Vehicle ID").waitFor();
  await auditScreen(page, viewport, "vehicle details", "vehicle-details.png");
  await page.getByRole("button", { name: "Purchase" }).click();
  await page.getByRole("alertdialog").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Confirm purchase" }).click();
  await page.getByRole("button", { name: "Out of stock" }).waitFor({ state: "visible" });
  if (!(await page.getByRole("button", { name: "Out of stock" }).isDisabled())) recordFailure(viewport, "vehicle details", "zero-stock purchase button is enabled");
  await page.getByRole("link", { name: /back to inventory/i }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Available vehicles" }).waitFor();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "admin@example.com");
  await auditScreen(page, viewport, "admin inventory", "admin-inventory.png");
  for (const [label, value] of Object.entries({
    "Vehicle make": "Honda",
    "Vehicle model": "Civic",
    "Vehicle category": "Sedan",
    "Vehicle price": "28000",
    "Vehicle quantity": "3",
  })) await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Add vehicle" }).click();
  await page.getByRole("heading", { name: "Honda Civic" }).waitFor();
  await page.getByRole("link", { name: "Honda Civic" }).click();
  await page.getByRole("heading", { name: "Honda Civic" }).waitFor();
  await auditScreen(page, viewport, "administrator vehicle details");
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Vehicle model").fill("Civic Touring");
  await page.getByRole("button", { name: "Save vehicle" }).click();
  await page.getByRole("heading", { name: "Honda Civic Touring" }).waitFor();
  await page.getByLabel("Restock quantity for Honda Civic Touring").fill("2");
  await page.getByRole("button", { name: "Restock" }).click();
  await page.getByText("5 in stock").waitFor();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Delete vehicle" }).click();
  await page.getByRole("heading", { name: "Honda Civic Touring" }).waitFor({ state: "detached" });

  console.log(`PASS ${viewport.width}x${viewport.height}: sign-in, customer inventory/details, and admin inventory/details`);
  await context.close();
}

try {
  server = spawn(process.execPath, [path.join(frontendDirectory, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: frontendDirectory,
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForVite();
  browser = await chromium.launch({ headless: true });
  for (const viewport of viewports) await runViewport(viewport);
  if (failures.length) {
    console.error(`\n${failures.length} responsive/accessibility finding(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`All ${viewports.length * 5} screen/viewport combinations passed overflow, control, focus, and axe checks.`);
  }
} finally {
  await browser?.close();
  server?.kill();
}
