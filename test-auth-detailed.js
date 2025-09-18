const http = require('http');

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ 
            ok: res.statusCode < 400, 
            json: () => Promise.resolve(jsonData), 
            status: res.statusCode,
            statusText: res.statusMessage 
          });
        } catch (e) {
          resolve({ 
            ok: res.statusCode < 400, 
            json: () => Promise.resolve({ message: data }), 
            status: res.statusCode,
            statusText: res.statusMessage 
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const testAuth = async () => {
  console.log('🚀 Testing Authentication System with SQLite');
  console.log('===============================================');

  // Use unique email for each test run
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  
  console.log(`📧 Using test email: ${testEmail}`);

  try {
    // Test 1: Register a new user
    console.log('\n📝 Test 1: Register new user');
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, JSON.stringify({
      email: testEmail,
      password: 'password123'
    }));

    console.log(`Response status: ${registerResponse.status} ${registerResponse.statusText}`);
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log('Token:', registerData.token.substring(0, 20) + '...');
      console.log('User ID:', registerData.user.id);
      console.log('User Email:', registerData.user.email);
      
      // Test 2: Try to register the same user again
      console.log('\n📝 Test 2: Try duplicate registration');
      const duplicateResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }, JSON.stringify({
        email: testEmail,
        password: 'password123'
      }));

      console.log(`Duplicate response status: ${duplicateResponse.status}`);
      if (!duplicateResponse.ok) {
        const errorData = await duplicateResponse.json();
        console.log('✅ Duplicate registration prevented:', errorData.error);
      } else {
        console.log('❌ Duplicate registration should have been prevented');
      }

      // Test 3: Login with correct credentials
      console.log('\n📝 Test 3: Login with correct credentials');
      const loginResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }, JSON.stringify({
        email: testEmail,
        password: 'password123'
      }));

      console.log(`Login response status: ${loginResponse.status}`);
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log('Token:', loginData.token.substring(0, 20) + '...');
        console.log('User ID:', loginData.user.id);
      } else {
        const errorData = await loginResponse.json();
        console.log('❌ Login failed:', errorData.error);
      }

      // Test 4: Login with wrong password
      console.log('\n📝 Test 4: Login with wrong password');
      const wrongPasswordResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }, JSON.stringify({
        email: testEmail,
        password: 'wrongpassword'
      }));

      console.log(`Wrong password response status: ${wrongPasswordResponse.status}`);
      if (!wrongPasswordResponse.ok) {
        const errorData = await wrongPasswordResponse.json();
        console.log('✅ Wrong password rejected:', errorData.error);
      } else {
        console.log('❌ Wrong password should have been rejected');
      }

    } else {
      const errorData = await registerResponse.json();
      console.log('❌ Registration failed:', errorData.error || errorData.message);
    }

    // Test 5: Test root endpoint
    console.log('\n📝 Test 5: Test root endpoint');
    const rootResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    
    console.log(`Root endpoint response status: ${rootResponse.status}`);
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log('✅ Root endpoint working:', rootData.message);
    } else {
      console.log('❌ Root endpoint failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎯 All tests completed!');
  console.log('📚 Visit http://localhost:3000/api-docs for Swagger documentation');
  console.log('💾 SQLite database file: ./dist/data/database.sqlite');
};

// Run tests
testAuth();