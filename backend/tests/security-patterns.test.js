const fs = require('fs');
const path = require('path');

console.log('🔍 DevSecOps Security Pattern Analysis');
console.log('=====================================');

// Read the main app file
const appPath = path.join(__dirname, '..', 'app.js');

if (!fs.existsSync(appPath)) {
  console.log('❌ app.js not found');
  process.exit(1);
}

const appContent = fs.readFileSync(appPath, 'utf8');
let vulnerabilityCount = 0;
let findings = [];

// Test 1: SQL Injection Detection
console.log('\n1. SQL Injection Pattern Detection:');
const sqlInjectionPatterns = [
  /`SELECT.*FROM.*WHERE.*=.*'\$\{.*\}'/g,
  /SELECT.*FROM.*WHERE.*=.*'\$\{.*\}'/g,
  /'.*\$\{username\}.*'/g,
  /'.*\$\{hashedPassword\}.*'/g
];

let sqlVulnFound = false;
sqlInjectionPatterns.forEach((pattern, index) => {
  const matches = appContent.match(pattern);
  if (matches) {
    console.log(`   🚨 FOUND: SQL injection pattern ${index + 1}`);
    matches.forEach(match => {
      console.log(`   📍 Code: ${match.substring(0, 80)}...`);
    });
    sqlVulnFound = true;
  }
});

if (sqlVulnFound) {
  vulnerabilityCount++;
  findings.push('SQL Injection vulnerability detected');
} else {
  console.log('   ✅ No SQL injection patterns detected');
}

// Test 2: MD5 Usage Detection  
console.log('\n2. Weak Cryptography Detection:');
const md5Pattern = /createHash\(['"]md5['"]\)/g;
const md5Matches = appContent.match(md5Pattern);
if (md5Matches) {
  console.log('   🚨 FOUND: Weak MD5 hashing detected');
  console.log(`   📍 Occurrences: ${md5Matches.length}`);
  console.log('   💡 Recommendation: Use bcrypt or Argon2');
  vulnerabilityCount++;
  findings.push('Weak MD5 cryptography detected');
} else {
  console.log('   ✅ No weak hashing detected');
}

// Test 3: Path Traversal Detection
console.log('\n3. Path Traversal Detection:');
const pathTraversalPatterns = [
  /path\.join\(__dirname,.*req\.params\.\w+/g,
  /res\.download\(.*filename/g,
  /req\.params\.filename/g
];

let pathVulnFound = false;
pathTraversalPatterns.forEach((pattern, index) => {
  const matches = appContent.match(pattern);
  if (matches) {
    console.log(`   🚨 FOUND: Path traversal pattern ${index + 1}`);
    matches.forEach(match => {
      console.log(`   📍 Code: ${match}`);
    });
    pathVulnFound = true;
  }
});

if (pathVulnFound) {
  vulnerabilityCount++;
  findings.push('Path traversal vulnerability detected');
} else {
  console.log('   ✅ No path traversal patterns detected');
}

// Test 4: XSS Vulnerability Detection
console.log('\n4. XSS Vulnerability Detection:');
const xssPatterns = [
  /message:.*\`.*\$\{username\}/g,
  /\`.*\$\{email\}/g,
  /res\.send\(.*username/g,
  /Welcome.*\$\{.*\}/g
];

let xssVulnFound = false;
xssPatterns.forEach((pattern, index) => {
  const matches = appContent.match(pattern);
  if (matches) {
    console.log(`   🚨 FOUND: Potential XSS pattern ${index + 1}`);
    matches.forEach(match => {
      console.log(`   📍 Code: ${match.substring(0, 60)}...`);
    });
    xssVulnFound = true;
  }
});

if (xssVulnFound) {
  vulnerabilityCount++;
  findings.push('XSS vulnerability detected');
} else {
  console.log('   ✅ No XSS patterns detected');
}

// Test 5: CORS Configuration Check
console.log('\n5. CORS Configuration Check:');
const corsPattern = /app\.use\(cors\(\)\)/g;
const corsMatches = appContent.match(corsPattern);
if (corsMatches) {
  console.log('   ⚠️  CORS enabled without restrictions');
  console.log('   💡 Consider restricting origins in production');
  // Don't count as vulnerability for this lab
} else {
  console.log('   ✅ No unrestricted CORS detected');
}

// Test 6: Input Validation Check
console.log('\n6. Input Validation Analysis:');
const directInputPattern = /req\.(body|query|params)\.\w+(?!.*(?:validate|sanitize|check))/g;
const inputMatches = appContent.match(directInputPattern);
if (inputMatches && inputMatches.length > 5) {
  console.log(`   ⚠️  Found ${inputMatches.length} direct input usages`);
  console.log('   💡 Consider adding input validation');
  inputMatches.slice(0, 3).forEach(match => {
    console.log(`   📍 ${match}`);
  });
  if (inputMatches.length > 3) {
    console.log(`   ... and ${inputMatches.length - 3} more`);
  }
} else {
  console.log('   ✅ Input usage appears controlled');
}

// Summary
console.log('\n=== SECURITY ANALYSIS SUMMARY ===');
console.log(`Student Analysis Complete`);
console.log(`Total vulnerability categories found: ${vulnerabilityCount}`);
console.log(`Security findings:`);

if (findings.length > 0) {
  findings.forEach((finding, index) => {
    console.log(`  ${index + 1}. ${finding}`);
  });
  console.log('\n❌ Security vulnerabilities detected');
  console.log('🔧 Action required: Review and fix the identified issues');
  console.log('\n📝 Specific Issues Found:');
  console.log('   • SQL Injection: Use parameterized queries instead of string interpolation');
  console.log('   • Weak Crypto: Replace MD5 with bcrypt for password hashing');
  console.log('   • Path Traversal: Validate and sanitize filename parameters');
  console.log('   • XSS: Sanitize user input before including in responses');
  
  // Write results for Jenkins
  fs.writeFileSync('security-test-results.txt', `FAILED: ${vulnerabilityCount} vulnerabilities found\n${findings.join('\n')}`);
  process.exit(1);
} else {
  console.log('  ✅ No major security vulnerabilities detected');
  console.log('\n🎉 Security test passed!');
  
  // Write results for Jenkins
  fs.writeFileSync('security-test-results.txt', 'PASSED: No vulnerabilities detected');
  process.exit(0);
}