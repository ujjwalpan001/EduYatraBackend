// Test the API endpoint directly
const axios = require('axios');

const questionBankId = '6880f0ac9de1667ac43d1fed'; // Math limit bank
const apiUrl = `https://eduyatrabackend.onrender.com/api/question-banks/questions?questionBankId=${questionBankId}`;

// You need to replace this with your actual token from localStorage
const token = 'YOUR_TOKEN_HERE';

console.log('🔍 Testing API endpoint:', apiUrl);
console.log('');

axios.get(apiUrl, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => {
  console.log('✅ API Response Status:', response.status);
  console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));
  console.log('');
  console.log('📊 Number of questions:', response.data.questions?.length || 0);
  
  if (response.data.questions && response.data.questions.length > 0) {
    const firstQ = response.data.questions[0];
    console.log('');
    console.log('🔍 First question:');
    console.log('   ID:', firstQ._id);
    console.log('   Has latex_code:', !!firstQ.latex_code);
    console.log('   Has katex_code:', !!firstQ.katex_code);
    console.log('   latex_code length:', firstQ.latex_code?.length || 0);
    console.log('   katex_code length:', firstQ.katex_code?.length || 0);
    console.log('   Subject:', firstQ.subject);
  }
})
.catch(error => {
  console.error('❌ Error:', error.response?.data || error.message);
});
