async function testLogin() {
  const email = process.env.TEST_EMAIL || "test@example.com";
  const password = process.env.TEST_PASSWORD || "CHANGE_ME";

  try {
    const response = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);

  } catch (error) {
    console.error('Login test failed:', error);
  }
}

testLogin();
