pipeline {
  agent any
  tools {
      nodejs 'Node 18' // Ensure this matches your Jenkins NodeJS installation name
  }
  environment {
    // Jenkins credentials: Secret Text credential named SONAR_TOKEN
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    // The SonarScanner tool you installed globally
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh '''
          docker build --pull \
            -t devsecops_lab_app:latest \
            ./app
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        // Ensure Node.js is available in PATH for SonarQube
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            # Verify Node.js is available
            echo "Node version: $(node --version)"
            echo "NPM version: $(npm --version)"
            
            # Run SonarQube scanner from project root with explicit configuration
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=$SONAR_TOKEN \
              -Dsonar.projectKey=devsecops_lab \
              -Dsonar.projectName="DevSecOps Lab" \
              -Dsonar.projectVersion=1.0 \
              -Dsonar.sources=app \
              -Dsonar.exclusions="**/node_modules/**,**/coverage/**,**/*.spec.js,**/*.test.js" \
              -Dsonar.javascript.file.suffixes=.js,.jsx \
              -Dsonar.css.file.suffixes=.css,.scss,.sass \
              -Dsonar.sourceEncoding=UTF-8
          '''
        }
      }
    }

    stage('Run App Container') {
      steps {
        sh '''
          # Clean up any previous instance
          docker rm -f devsecops_app 2>/dev/null || true

          # Start the app container with proper networking
          docker run -d \
            --name devsecops_app \
            --network bridge \
            -p 9080:3009 \
            devsecops_lab_app:latest
          
          # Wait longer for Node.js app to initialize
          echo "Waiting for Node.js application to start..."
          sleep 15
          
          # Check if container is running
          if ! docker ps | grep -q devsecops_app; then
            echo "Container failed to start. Checking logs:"
            docker logs devsecops_app
            exit 1
          fi
          
          # Show container logs for debugging
          echo "=== Container logs ==="
          docker logs devsecops_app
          
          # Check what's running inside container  
          echo "=== Container processes ==="
          docker exec devsecops_app ps aux || echo "Could not list processes"
          
          # Test internal connectivity first
          echo "=== Testing internal connectivity ==="
          docker exec devsecops_app curl -s http://localhost:3009 | head -5 || echo "Internal connection failed"
          
          # Check Docker port mapping
          echo "=== Docker port mapping ==="
          docker port devsecops_app
          
          # Test external accessibility with different approaches
          echo "=== Testing external accessibility ==="
          
          # Method 1: Direct curl test
          if curl -f --connect-timeout 10 --max-time 10 http://localhost:9080; then
            echo "✓ Direct external access works!"
          else
            echo "✗ Direct external access failed"
            
            # Method 2: Try accessing through container IP
            CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' devsecops_app)
            echo "Container IP: $CONTAINER_IP"
            if [ ! -z "$CONTAINER_IP" ]; then
              curl -f --connect-timeout 5 http://$CONTAINER_IP:3009 || echo "Container IP access failed"
            fi
            
            # Method 3: Check if port is bound on host
            netstat -tuln 2>/dev/null | grep 9080 || ss -tuln 2>/dev/null | grep 9080 || echo "Port 9080 not bound on host"
          fi
          
          # Test common application endpoints to verify it's a full web app
          echo "=== Testing application endpoints ==="
          ENDPOINTS=("/" "/login" "/register" "/api/login" "/api/register" "/dashboard" "/admin")
          
          for endpoint in "${ENDPOINTS[@]}"; do
            echo "Testing: http://localhost:9080$endpoint"
            curl -s -o /dev/null -w "Status: %{http_code}, Size: %{size_download}bytes" "http://localhost:9080$endpoint" 2>/dev/null || echo "Connection failed"
            echo ""
          done
          
          # Show application structure to understand what we're testing
          echo "=== Application structure ==="
          docker exec devsecops_app find /usr/src/app -name "*.js" -type f | head -10
          
          # Try to peek at the main app file to see routes
          echo "=== Application routes (if visible) ==="
          docker exec devsecops_app head -30 /usr/src/app/app.js 2>/dev/null || echo "Could not read app.js"
        '''
      }
    }

    stage('OWASP ZAP Targeted Scan (SQLi & XSS Only)') {
      steps {
        sh '''
          # Create ZAP configuration directory
          mkdir -p ${WORKSPACE}/zap-config
          chmod 777 ${WORKSPACE}/zap-config
          
          # Create ZAP automation configuration to test API endpoints
          cat > ${WORKSPACE}/zap-config/automation.yaml << 'EOF'
env:
  contexts:
    - name: "DevSecOps App"
      urls:
        - "http://localhost:9080"
      includePaths:
        - "http://localhost:9080.*"
      excludePaths: []
      authentication:
        method: "manual"
      sessionManagement:
        method: "cookie"
      
jobs:
  - type: spider
    parameters:
      url: "http://localhost:9080"
      maxDuration: 2
      maxDepth: 5
      numberOfThreads: 5
      
  - type: spiderAjax
    parameters:
      url: "http://localhost:9080"
      maxDuration: 2
      maxCrawlDepth: 5
      numberOfBrowsers: 1
      
  - type: activeScan
    parameters:
      context: "DevSecOps App"
      scanners:
        - 40018  # SQL Injection
        - 40012  # Cross Site Scripting (Reflected)
        - 40014  # Cross Site Scripting (Persistent)
        - 40016  # Cross Site Scripting (Persistent) - Prime
        - 40017  # Cross Site Scripting (Persistent) - Spider
        - 40019  # SQL Injection - MySQL
        - 40020  # SQL Injection - Hypersonic SQL
        - 40021  # SQL Injection - Oracle
        - 40022  # SQL Injection - PostgreSQL
        - 40024  # SQL Injection - SQLite
        - 40027  # SQL Injection - MsSQL
      attackStrength: "HIGH"
      alertThreshold: "LOW"
      
  - type: report
    parameters:
      template: "traditional-html"
      reportDir: "/zap/wrk/"
      reportFile: "zap_report.html"
      
  - type: report
    parameters:
      template: "traditional-json"
      reportDir: "/zap/wrk/"
      reportFile: "zap_report.json"
EOF

          # Wait for app to be ready and test API endpoints
          echo "=== Testing application API endpoints ==="
          sleep 15
          
          # Test if we can reach the login endpoint
          if curl -s -X POST -H "Content-Type: application/json" \
               -d '{"username":"admin","password":"admin123"}' \
               http://localhost:9080/api/login | grep -q "success"; then
            echo "✓ API login endpoint is working"
          else
            echo "⚠ API login endpoint test failed, but continuing scan..."
          fi
          
          # Test basic connectivity
          curl -s http://localhost:9080 > /dev/null && echo "✓ Base URL accessible" || echo "⚠ Base URL not accessible"
          
          # Run ZAP with API-focused scanning
          echo "=== Starting ZAP API Security Scan ==="
          timeout 30m docker run --rm \
            --network host \
            --user root \
            -v ${WORKSPACE}:/zap/wrk/:rw \
            zaproxy/zap-stable zap-full-scan.py \
              -t http://localhost:9080 \
              -r zap_report.html \
              -J zap_report.json \
              -l WARN -d \
              -z "-config scanner.attackStrength=HIGH \
                  -config scanner.alertThreshold=LOW \
                  -addoninstall ascanrulesBeta \
                  -activescan.scannerid 40018,40012,40014,40016,40017,40019,40020,40021,40022,40024,40027 \
                  -quickurl http://localhost:9080/api/login \
                  -quickurl http://localhost:9080/api/register \
                  -quickurl http://localhost:9080/api/notes \
                  -quickurl http://localhost:9080/api/dashboard/stats \
                  -quickform http://localhost:9080/api/login:username,password \
                  -quickform http://localhost:9080/api/register:username,password,email" \
              || echo "ZAP scan completed with exit code: $?"
          
          # Manual API endpoint testing with vulnerable payloads
          echo "=== Manual SQL Injection Testing ==="
          
          # Test SQL injection in login
          echo "Testing SQL injection in login endpoint..."
          curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"username\":\"admin' OR '1'='1\",\"password\":\"test\"}" \
            http://localhost:9080/api/login | head -10 || echo "Login SQLi test failed"
          
          # Test basic XSS payload
          echo "Testing XSS payload creation..."
          curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"username\":\"testuser\",\"password\":\"test\",\"email\":\"<script>alert('xss')</script>@test.com\"}" \
            http://localhost:9080/api/register | head -10 || echo "Register XSS test failed"
          
          # Check for generated reports
          echo "=== Checking for ZAP reports ==="
          ls -la ${WORKSPACE}/ | grep -i zap || echo "No ZAP files in workspace root"
          find ${WORKSPACE} -name "*zap*" -type f || echo "No ZAP files found"
          
          # Display manual test results summary
          echo "=== Manual Vulnerability Test Summary ==="
          echo "1. SQL Injection endpoints tested: /api/login, /api/register"
          echo "2. XSS endpoints tested: /api/register (email field)"
          echo "3. Check the ZAP reports for comprehensive automated findings"
          echo "4. Your app contains multiple intentional vulnerabilities for testing"
        '''
        
        // Archive reports and provide vulnerability summary
        script {
          def reportFiles = []
          if (fileExists('zap_report.html')) reportFiles.add('zap_report.html')
          if (fileExists('zap_report.json')) reportFiles.add('zap_report.json')
          
          // Look for any ZAP files
          def zapFiles = sh(
            script: "find ${WORKSPACE} -name '*zap*' -type f 2>/dev/null || true",
            returnStdout: true
          ).trim()
          
          if (zapFiles) {
            echo "Found ZAP files: ${zapFiles}"
            zapFiles.split('\n').each { file ->
              if (file && file.contains('.html') || file.contains('.json')) {
                def fileName = file.split('/').last()
                if (!reportFiles.contains(fileName)) {
                  reportFiles.add(fileName)
                }
              }
            }
          }
          
          if (reportFiles) {
            archiveArtifacts artifacts: reportFiles.join(','), fingerprint: true, allowEmptyArchive: true
            echo "✅ Archived ZAP reports: ${reportFiles.join(', ')}"
          } else {
            echo "⚠ No ZAP report files found to archive"
          }
          
          // Vulnerability summary based on your app.js analysis
          echo """
=== VULNERABILITY ANALYSIS SUMMARY ===
Your application contains the following intentional vulnerabilities:

🔴 CRITICAL VULNERABILITIES FOUND:
1. SQL Injection in /api/login (Line 78-84)
2. SQL Injection in /api/notes (Line 170-179) 
3. Command Injection in /api/admin/backup-db (Line 234-251)
4. Path Traversal in /api/download/:filename (Line 293-299)

🟠 HIGH VULNERABILITIES:
5. Stored XSS in note content (Multiple locations)
6. Broken Access Control (Multiple endpoints)
7. Weak Password Hashing (MD5) (Line 66-68)
8. CSRF in /api/user/update-email (Line 302-313)

🟡 MEDIUM VULNERABILITIES:
9. Hardcoded Credentials (Line 18-22)
10. Information Disclosure (Detailed error messages)
11. Insecure Cookies (No secure flags)
12. Missing Input Validation

ZAP should detect many of these in the automated scan.
Check the archived reports for detailed findings!
          """
        }
      }
    }
  }

  post {
    always {
      sh '''
        # Clean up containers
        docker stop devsecops_app 2>/dev/null || true
        docker rm devsecops_app 2>/dev/null || true
        docker image prune -f
      '''
    }
    failure {
      sh '''
        # Debug information on failure
        echo "=== Docker containers ==="
        docker ps -a
        echo "=== Docker logs for devsecops_app ==="
        docker logs devsecops_app 2>/dev/null || echo "No logs available"
      '''
    }
  }
}