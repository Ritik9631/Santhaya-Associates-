async function checkHeadings() {
  const res = await fetch('http://localhost:3000/services');
  const text = await res.text();
  const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  console.log('H1:', h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : 'NO H1 FOUND');
}

checkHeadings();

