/**
 * Everything a customer needs to reskin the login screen lives in this one
 * file. `renderLoginForm` / `renderLoginError` are pure HTML renderers with
 * no OAuth logic — replace the markup/CSS/copy freely, just keep:
 *   - the <form> posting to `action` with method="POST"
 *   - an <input name="email"> the user fills in
 *   - one hidden <input> per entry in `hidden`, verbatim (name + value),
 *     so the OAuth request survives the round trip through this page
 */

export function renderLoginForm(opts: {
	action: string;
	hidden: Record<string, string>;
	error?: string;
}): string {
	const hiddenInputs = Object.entries(opts.hidden)
		.map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
		.join("\n      ");

	const errorBlock = opts.error
		? `<p class="error">${escapeHtml(opts.error)}</p>`
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f5f5f7;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    padding: 2.5rem;
    width: 100%;
    max-width: 360px;
  }
  h1 {
    font-size: 1.25rem;
    margin: 0 0 1.5rem;
    text-align: center;
    color: #1a1a1a;
  }
  label {
    display: block;
    font-size: 0.875rem;
    color: #444;
    margin-bottom: 0.375rem;
  }
  input[type="email"] {
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 1rem;
    border: 1px solid #d0d0d5;
    border-radius: 8px;
    box-sizing: border-box;
    margin-bottom: 1.25rem;
  }
  button {
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: #1a1a1a;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }
  button:hover {
    background: #333;
  }
  .error {
    color: #b3261e;
    font-size: 0.875rem;
    margin: -0.75rem 0 1rem;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>Sign in to continue</h1>
    <form method="POST" action="${escapeHtml(opts.action)}">
      ${errorBlock}
      ${hiddenInputs}
      <label for="email">Email address</label>
      <input type="email" id="email" name="email" required autofocus placeholder="you@company.com">
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`;
}

export function renderLoginError(message: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign-in error</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f5f5f7;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    padding: 2.5rem;
    width: 100%;
    max-width: 360px;
    text-align: center;
  }
  h1 { font-size: 1.125rem; color: #b3261e; margin: 0 0 0.75rem; }
  p { color: #444; font-size: 0.9375rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>Sign-in failed</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
