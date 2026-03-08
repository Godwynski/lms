const COUCHDB_URL = 'http://localhost:5984'
const APP_URL = 'http://localhost:3000'

async function test() {
  console.log("Authenticating...")
  const login = await fetch(`${COUCHDB_URL}/_session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'admin@example.com', password: 'password123' })
  })
  if (!login.ok) {
    console.log("Login failed", await login.text())
    return
  }
  const setCookie = login.headers.get('set-cookie')
  const authCookie = setCookie.match(/AuthSession=([^;]+)/)[0]
  console.log("Cookie:", authCookie)
  
  console.log("Fetching /admin/books page...")
  const page = await fetch(`${APP_URL}/admin/books`, {
    headers: { 'Cookie': authCookie }
  })
  
  if (!page.ok) {
    console.log("Fetch failed", page.status, await page.text())
  } else {
    console.log("Fetch success!", page.status, "HTML bytes:", (await page.text()).length)
  }
}
test().catch(console.error)
