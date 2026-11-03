async function inspectServices() {
  const res = await fetch('http://localhost:3000/services');
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Length:', text.length);
  console.log('Sample:', text.slice(0, 500));
}

inspectServices().catch(console.error);

