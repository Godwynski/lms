const COUCHDB_URL = 'http://localhost:5984'
async function test() {
  const req = await fetch(`${COUCHDB_URL}/lms/_find`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('admin:password123').toString('base64')
    },
    body: JSON.stringify({
      selector: { 
        type: 'borrowing_record', 
        borrower_id: 'admin@example.com',
        status: { $in: ['borrowed', 'pending', 'pending_return', 'overdue'] }
      }
    })
  })
  
  const text = await req.text()
  console.log(req.status, text)
}
test()
