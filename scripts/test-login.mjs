async function testLogin() {
  try {
    const response = await fetch('http://localhost:5000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'thomacyshody@gmail.com',
        password: 'thomas500500'
      }),
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