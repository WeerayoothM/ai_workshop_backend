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

const testProfile = async () => {
  console.log('🚀 Testing Profile Management System');
  console.log('==================================');

  const timestamp = Date.now();
  const testEmail = `profile${timestamp}@example.com`;
  let authToken = '';
  
  console.log(`📧 Using test email: ${testEmail}`);

  try {
    // Step 1: Register a new user
    console.log('\n📝 Step 1: Register new user');
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

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      console.log('❌ Registration failed:', errorData.error);
      return;
    }

    const registerData = await registerResponse.json();
    authToken = registerData.token;
    console.log('✅ Registration successful');
    console.log('User ID:', registerData.user.id);
    console.log('Membership Level:', registerData.user.membershipLevel);
    console.log('Points:', registerData.user.points);

    // Step 2: Get initial profile
    console.log('\n📝 Step 2: Get initial profile');
    const getProfileResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (getProfileResponse.ok) {
      const profileData = await getProfileResponse.json();
      console.log('✅ Profile retrieved successfully');
      console.log('Initial profile:', {
        email: profileData.user.email,
        firstName: profileData.user.firstName || 'null',
        lastName: profileData.user.lastName || 'null',
        phone: profileData.user.phone || 'null',
        membershipLevel: profileData.user.membershipLevel,
        points: profileData.user.points
      });
    } else {
      const errorData = await getProfileResponse.json();
      console.log('❌ Get profile failed:', errorData.error);
      return;
    }

    // Step 3: Update profile with Thai user data (like in the UI)
    console.log('\n📝 Step 3: Update profile with Thai user data');
    const updateData = {
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      phone: '081-234-5678',
      membershipLevel: 'Gold',
      points: 15420
    };

    const updateProfileResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/profile',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    }, JSON.stringify(updateData));

    if (updateProfileResponse.ok) {
      const updatedData = await updateProfileResponse.json();
      console.log('✅ Profile updated successfully');
      console.log('Updated profile:', {
        email: updatedData.user.email,
        firstName: updatedData.user.firstName,
        lastName: updatedData.user.lastName,
        phone: updatedData.user.phone,
        membershipLevel: updatedData.user.membershipLevel,
        points: updatedData.user.points,
        membershipId: `LBK${updatedData.user.id.slice(-5)}` // Simulate membership ID
      });
    } else {
      const errorData = await updateProfileResponse.json();
      console.log('❌ Update profile failed:', errorData.error);
      return;
    }

    // Step 4: Verify updated profile
    console.log('\n📝 Step 4: Verify updated profile');
    const verifyProfileResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (verifyProfileResponse.ok) {
      const verifiedData = await verifyProfileResponse.json();
      console.log('✅ Profile verification successful');
      console.log('Final profile matches update:', {
        firstName: verifiedData.user.firstName === updateData.firstName,
        lastName: verifiedData.user.lastName === updateData.lastName,
        phone: verifiedData.user.phone === updateData.phone,
        membershipLevel: verifiedData.user.membershipLevel === updateData.membershipLevel,
        points: verifiedData.user.points === updateData.points
      });
    }

    // Step 5: Test invalid membership level
    console.log('\n📝 Step 5: Test invalid membership level');
    const invalidUpdateResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/profile',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    }, JSON.stringify({
      membershipLevel: 'Diamond' // Invalid level
    }));

    if (!invalidUpdateResponse.ok) {
      const errorData = await invalidUpdateResponse.json();
      console.log('✅ Invalid membership level properly rejected:', errorData.error);
    }

    // Step 6: Test unauthorized access
    console.log('\n📝 Step 6: Test unauthorized access');
    const unauthorizedResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/auth/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!unauthorizedResponse.ok) {
      const errorData = await unauthorizedResponse.json();
      console.log('✅ Unauthorized access properly blocked:', errorData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎯 Profile management tests completed!');
  console.log('📚 Visit http://localhost:3000/api-docs for API documentation');
  console.log('💾 Profile data stored in SQLite database');
};

// Run tests
testProfile();