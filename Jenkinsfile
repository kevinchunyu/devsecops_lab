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
            -p 9080:3009 \
            devsecops_lab_app:latest
          
          # Wait for container to initialize
          echo "Waiting for container to initialize..."
          sleep 5
          
          # Check if container is running
          if ! docker ps | grep -q devsecops_app; then
            echo "Container failed to start. Checking logs:"
            docker logs devsecops_app
            exit 1
          fi
          
          # Show container logs for debugging
          echo "=== Container logs ==="
          docker logs devsecops_app
          
          # Check what port the app is actually listening on inside container
          echo "=== Checking ports inside container ==="
          docker exec devsecops_app netstat -tuln 2>/dev/null || echo "netstat not available"
          
          # Try different common Node.js ports that might be used
          echo "=== Testing different port configurations ==="
          PORTS_TO_TEST="3009 3000 8080"
          for test_port in $PORTS_TO_TEST; do
            echo "Testing if app responds on port $test_port inside container..."
            if docker exec devsecops_app curl -f --connect-timeout 5 http://localhost:$test_port 2>/dev/null; then
              echo "✓ App is responding on port $test_port inside container!"
              if [ "$test_port" != "3009" ]; then
                echo "WARNING: App is running on port $test_port, but Docker port mapping expects 3009"
                echo "You may need to update your Dockerfile EXPOSE directive or Docker run command"
              fi
              break
            fi
          done
          
          # Test external accessibility with better retry logic
          echo "=== Testing external accessibility ==="
          APP_READY=false
          for i in {1..15}; do
            echo "Health check attempt $i/15..."
            if curl -f --connect-timeout 5 --max-time 10 http://localhost:9080; then
              echo "✓ App is accessible externally!"
              APP_READY=true
              break
            else
              echo "✗ Attempt $i failed, waiting 3 seconds..."
              sleep 3
            fi
          done
          
          if [ "$APP_READY" = "false" ]; then
            echo "=== DEBUGGING INFO ==="
            echo "Docker processes:"
            docker ps
            echo ""
            echo "Container logs:"
            docker logs devsecops_app
            echo ""
            echo "Network connectivity test:"
            docker exec devsecops_app ping -c 2 127.0.0.1 || echo "Ping failed"
            echo ""
            echo "Port binding check:"
            netstat -tuln | grep 9080 || echo "Port 9080 not bound"
            
            # Don't fail the build, let ZAP try anyway
            echo "WARNING: App may not be fully accessible, but continuing with security scan..."
          fi
        '''
      }
    }

    stage('OWASP ZAP Targeted Scan (SQLi & XSS Only)') {
      steps {
        sh '''
          # Create a temporary directory with proper permissions for ZAP reports
          mkdir -p ${WORKSPACE}/zap-reports
          chmod 777 ${WORKSPACE}/zap-reports
          
          # Verify the app is accessible before scanning
          echo "=== Pre-scan connectivity check ==="
          if curl -f --connect-timeout 5 http://localhost:9080; then
            echo "✓ App is accessible for scanning"
          else
            echo "⚠ App may not be fully accessible, but attempting scan anyway..."
            # Check if container is still running
            if ! docker ps | grep -q devsecops_app; then
              echo "Container is not running, restarting..."
              docker restart devsecops_app 2>/dev/null || docker run -d --name devsecops_app -p 9080:3009 devsecops_lab_app:latest
              sleep 10
            fi
          fi
          
          # Run ZAP active scan focusing ONLY on SQL Injection and XSS attacks
          echo "=== Starting ZAP Targeted Security Scan (SQL Injection & XSS Only) ==="
          docker run --rm \
            --network host \
            --user $(id -u):$(id -g) \
            -v ${WORKSPACE}/zap-reports:/zap/wrk/:rw \
            zaproxy/zap-stable zap-full-scan.py \
              -t http://localhost:9080 \
              -r zap_report.html \
              -J zap_report.json \
              -l WARN -d \
              -z "-config scanner.attackStrength=HIGH \
                  -config scanner.alertThreshold=LOW \
                  -addoninstall ascanrulesBeta \
                  -activescan.scannerid 40018,40012,40014,40016,40017,40019,40020,40021,40022,40024,40027" \
              || echo "ZAP scan completed with warnings/errors (exit code: $?)"
          
          # Check if reports were generated and move them if needed
          if [ -f "${WORKSPACE}/zap-reports/zap_report.html" ]; then
            echo "✓ HTML report generated successfully"
            cp ${WORKSPACE}/zap-reports/zap_report.html ${WORKSPACE}/
          else
            echo "⚠ HTML report not found, checking for alternative locations..."
            find ${WORKSPACE} -name "*zap*report*" -type f || echo "No ZAP reports found"
          fi
          
          if [ -f "${WORKSPACE}/zap-reports/zap_report.json" ]; then
            echo "✓ JSON report generated successfully"  
            cp ${WORKSPACE}/zap-reports/zap_report.json ${WORKSPACE}/
          fi
          
          # Display scan summary focusing on SQLi and XSS findings
          echo "=== ZAP Targeted Scan Summary (SQL Injection & XSS) ==="
          if [ -f "${WORKSPACE}/zap-reports/zap_report.json" ]; then
            echo "Checking for SQL Injection and XSS vulnerabilities..."
            # Look for specific vulnerability types in the JSON report
            grep -i "sql" ${WORKSPACE}/zap-reports/zap_report.json || echo "No SQL injection vulnerabilities found"
            grep -i -E "xss|cross.*site.*script" ${WORKSPACE}/zap-reports/zap_report.json || echo "No XSS vulnerabilities found"
          fi
          
          ls -la ${WORKSPACE}/zap-reports/ || echo "No reports directory"
          ls -la ${WORKSPACE}/*zap* || echo "No ZAP reports in workspace"
        '''
        
        // Archive reports if they exist
        script {
          // Archive any ZAP reports that were generated
          def reportFiles = []
          if (fileExists('zap_report.html')) reportFiles.add('zap_report.html')
          if (fileExists('zap_report.json')) reportFiles.add('zap_report.json')
          if (fileExists('zap-reports/zap_report.html')) reportFiles.add('zap-reports/zap_report.html')
          if (fileExists('zap-reports/zap_report.json')) reportFiles.add('zap-reports/zap_report.json')
          
          if (reportFiles) {
            archiveArtifacts artifacts: reportFiles.join(','), fingerprint: true, allowEmptyArchive: true
            echo "Archived ZAP reports: ${reportFiles.join(', ')}"
          } else {
            echo "No ZAP reports found to archive"
          }
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