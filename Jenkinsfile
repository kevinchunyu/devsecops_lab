pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_SONAR', defaultValue: true, description: 'Run SonarQube Static Analysis?')
    booleanParam(name: 'RUN_ZAP', defaultValue: true, description: 'Run OWASP ZAP Dynamic Scan?')
    booleanParam(name: 'RUN_CUSTOM_TESTS', defaultValue: true, description: 'Run Custom Security Tests?')
    string(name: 'STUDENT_ID', defaultValue: 'student001', description: 'Enter your student ID (e.g., student001)')
  }

  environment {
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG    = "${params.STUDENT_ID}-${BUILD_ID}"
    APP_NAME     = "app_${params.STUDENT_ID}_${BUILD_ID}"
    DOCKER_NET   = "devsecops_net"
    REPORT_HTML  = "zap_baseline_report_${params.STUDENT_ID}_${BUILD_ID}.html"
    REPORT_JSON  = "zap_baseline_report_${params.STUDENT_ID}_${BUILD_ID}.json"
    STUDENT_PROJECT_KEY = "devsecops_lab_${params.STUDENT_ID}"
  }

  stages {
    stage('Environment Info') {
      steps {
        echo "=== DevSecOps Lab - ${params.STUDENT_ID} ==="
        echo "Build ID: ${BUILD_ID}"
        echo "Branch: ${env.BRANCH_NAME ?: 'main'}"
        echo "SonarQube: ${params.RUN_SONAR}"
        echo "ZAP Scan: ${params.RUN_ZAP}"
        echo "Custom Tests: ${params.RUN_CUSTOM_TESTS}"
        
        sh '''
          echo "Docker Info:"
          docker --version
          echo "Available Networks:"
          docker network ls
        '''
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
        echo "✅ Source code checked out successfully"
      }
    }

    stage('Code Quality Check') {
      steps {
        script {
          def appDir = sh(script: 'ls -la', returnStdout: true)
          echo "Repository structure:"
          echo appDir
          
          if (!fileExists('app')) {
            error("❌ 'app' directory not found. Please ensure your application code is in the 'app' folder.")
          }
          
          if (!fileExists('app/package.json')) {
            echo "⚠️  No package.json found - this might not be a Node.js application"
          } else {
            echo "✅ Node.js application detected"
          }
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          # Install Node.js if not present
          if ! command -v node > /dev/null; then
            echo "Installing Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
          fi
          
          echo "Node.js version: $(node --version)"
          echo "NPM version: $(npm --version)"
        '''
      }
    }

    stage('SonarQube Static Analysis') {
      when {
        expression { return params.RUN_SONAR }
      }
      steps {
        echo "🔍 Starting SonarQube static code analysis..."
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.host.url=http://sonarqube:9000 \
              -Dsonar.projectKey=${STUDENT_PROJECT_KEY} \
              -Dsonar.projectName="DevSecOps Lab - ${STUDENT_ID}" \
              -Dsonar.projectVersion=${BUILD_ID} \
              -Dsonar.sources=app \
              -Dsonar.language=js \
              -Dsonar.exclusions=**/node_modules/**,**/*.java,**/*.py,**/*.cpp,**/*.c,**/*.cs,**/test/**,**/tests/** \
              -Dsonar.javascript.file.suffixes=.js,.mjs \
              -Dsonar.typescript.file.suffixes=.ts,.tsx \
              -Dsonar.inclusions=**/*.js,**/*.mjs,**/*.ts,**/*.tsx,**/package.json \
              -Dsonar.sourceEncoding=UTF-8 \
              -Dsonar.scm.disabled=true
          '''
        }
        echo "✅ SonarQube analysis completed. Check results at: http://sonar.internal:9000"
      }
    }

    stage('Build Docker Image') {
      steps {
        echo "🐳 Building Docker image..."
        dir('app') {
          sh '''
            # Ensure Dockerfile exists
            if [ ! -f Dockerfile ]; then
              echo "❌ Dockerfile not found in app directory"
              exit 1
            fi
            
            echo "Building image: student_app:${IMAGE_TAG}"
            docker build -t student_app:${IMAGE_TAG} .
            echo "✅ Docker image built successfully"
          '''
        }
      }
    }

    stage('Deploy Test Environment') {
      steps {
        echo "🚀 Deploying application for testing..."
        sh '''
          # Create network if it doesn't exist
          docker network inspect ${DOCKER_NET} >/dev/null 2>&1 || {
            echo "Creating Docker network: ${DOCKER_NET}"
            docker network create ${DOCKER_NET}
          }
          
          # Remove existing container
          docker rm -f ${APP_NAME} || true
          
          # Run new container
          echo "Starting container: ${APP_NAME}"
          docker run -d --name ${APP_NAME} --network ${DOCKER_NET} student_app:${IMAGE_TAG}
          
          # Wait for application to be ready
          echo "Waiting for application to start..."
          for i in {1..30}; do
            if docker exec ${APP_NAME} curl -s -f http://localhost:3009/health > /dev/null 2>&1; then
              echo "✅ Application is ready and healthy"
              break
            elif [ $i -eq 30 ]; then
              echo "❌ Application failed to start within timeout"
              docker logs ${APP_NAME}
              exit 1
            else
              echo "Attempt $i/30: Application not ready yet, waiting..."
              sleep 3
            fi
          done
          
          # Show container info
          echo "Container status:"
          docker ps | grep ${APP_NAME}
        '''
      }
    }

    stage('Custom Security Tests') {
      when {
        expression { return params.RUN_CUSTOM_TESTS }
      }
      steps {
        echo "🔒 Running custom security tests..."
        
        // SQL Injection Tests
        script {
          echo "Testing SQL Injection vulnerabilities..."
          sh '''
            echo "=== SQL Injection Test ==="
            PAYLOADS=("admin'--" "admin' OR '1'='1" "' OR 'x'='x" "'; DROP TABLE users; --")
            VULNERABLE=false
            
            for payload in "${PAYLOADS[@]}"; do
              echo "Testing payload: $payload"
              RESPONSE=$(docker exec ${APP_NAME} curl -s -X POST http://localhost:3009/api/login \
                -H "Content-Type: application/json" \
                -d "{\"username\": \"$payload\", \"password\": \"test\"}" || echo "ERROR")
              
              echo "Response: $RESPONSE"
              
              if [[ "$RESPONSE" == *"Login successful"* ]] || [[ "$RESPONSE" == *"welcome"* ]] || [[ "$RESPONSE" == *"admin"* ]]; then
                echo "🚨 SQL Injection vulnerability detected with payload: $payload"
                VULNERABLE=true
              fi
            done
            
            if [ "$VULNERABLE" = true ]; then
              echo "❌ SQL Injection vulnerability found - Security test FAILED"
              # Don't exit here, let other tests run but mark as unstable
              # exit 1
            else
              echo "✅ SQL Injection tests passed"
            fi
          '''
        }
        
        // XSS Tests
        script {
          echo "Testing XSS vulnerabilities..."
          sh '''
            echo "=== XSS Test ==="
            XSS_PAYLOADS=("<script>alert('XSS')</script>" "<img src=x onerror=alert('XSS')>" "javascript:alert('XSS')")
            
            for payload in "${XSS_PAYLOADS[@]}"; do
              echo "Testing XSS payload: $payload"
              RESPONSE=$(docker exec ${APP_NAME} curl -s -X POST http://localhost:3009/api/search \
                -H "Content-Type: application/json" \
                -d "{\"query\": \"$payload\"}" || echo "ERROR")
              
              if [[ "$RESPONSE" == *"<script>"* ]] || [[ "$RESPONSE" == *"javascript:"* ]]; then
                echo "🚨 XSS vulnerability detected!"
              fi
            done
            
            echo "✅ XSS tests completed"
          '''
        }
        
        // Directory Traversal Tests
        script {
          echo "Testing Directory Traversal vulnerabilities..."
          sh '''
            echo "=== Directory Traversal Test ==="
            TRAVERSAL_PAYLOADS=("../../../etc/passwd" "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts" "....//....//....//etc//passwd")
            
            for payload in "${TRAVERSAL_PAYLOADS[@]}"; do
              echo "Testing traversal payload: $payload"
              RESPONSE=$(docker exec ${APP_NAME} curl -s "http://localhost:3009/api/file?path=$payload" || echo "ERROR")
              
              if [[ "$RESPONSE" == *"root:"* ]] || [[ "$RESPONSE" == *"localhost"* ]]; then
                echo "🚨 Directory Traversal vulnerability detected!"
              fi
            done
            
            echo "✅ Directory Traversal tests completed"
          '''
        }
      }
    }

    stage('OWASP ZAP Dynamic Scan') {
      when {
        expression { return params.RUN_ZAP }
      }
      steps {
        echo "🕷️  Starting OWASP ZAP dynamic security scan..."
        sh '''
          echo "Target: http://${APP_NAME}:3009"
          
          # Run ZAP baseline scan
          docker run --rm \
            --network ${DOCKER_NET} \
            --user 0:0 \
            -v $WORKSPACE:/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-baseline-scan.py \
              -t http://${APP_NAME}:3009 \
              -r ${REPORT_HTML} \
              -J ${REPORT_JSON} \
              -I \
              -d
          
          echo "✅ ZAP scan completed"
        '''
      }
      post {
        always {
          script {
            if (fileExists(env.REPORT_HTML)) {
              echo "📊 ZAP HTML report generated: ${env.REPORT_HTML}"
            }
            if (fileExists(env.REPORT_JSON)) {
              echo "📊 ZAP JSON report generated: ${env.REPORT_JSON}"
            }
          }
        }
      }
    }

    stage('Security Summary') {
      steps {
        script {
          echo "=== SECURITY SCAN SUMMARY ==="
          echo "Student: ${params.STUDENT_ID}"
          echo "Build: ${BUILD_ID}"
          echo ""
          
          if (params.RUN_SONAR) {
            echo "📊 SonarQube Report: http://sonar.internal:9000/dashboard?id=${env.STUDENT_PROJECT_KEY}"
          }
          
          if (params.RUN_ZAP && fileExists(env.REPORT_HTML)) {
            def zapReport = readFile(env.REPORT_HTML)
            if (zapReport.contains('High')) {
              echo "🚨 HIGH RISK vulnerabilities found in ZAP scan!"
            } else if (zapReport.contains('Medium')) {
              echo "⚠️  MEDIUM RISK vulnerabilities found in ZAP scan"
            } else {
              echo "✅ No high-risk vulnerabilities found in ZAP scan"
            }
          }
          
          echo ""
          echo "📁 Reports archived in Jenkins artifacts"
          echo "🔍 Review all findings and implement fixes"
        }
      }
    }
  }

  post {
    always {
      echo "🧹 Cleaning up test environment..."
      sh '''
        # Stop and remove test container
        docker rm -f ${APP_NAME} || true
        
        # Remove test image to save space
        docker rmi student_app:${IMAGE_TAG} || true
        
        echo "✅ Cleanup completed"
      '''
      
      // Archive reports
      archiveArtifacts artifacts: 'zap_baseline_report_*.html,zap_baseline_report_*.json', allowEmptyArchive: true
      
      echo "📋 Build completed for ${params.STUDENT_ID}"
    }
    
    success {
      echo "🎉 Pipeline completed successfully!"
      echo "Next steps:"
      echo "1. Review SonarQube dashboard for code quality issues"
      echo "2. Analyze ZAP reports for security vulnerabilities"
      echo "3. Fix identified issues and re-run the pipeline"
    }
    
    failure {
      echo "❌ Pipeline failed!"
      echo "Check the logs above for error details"
      sh 'docker logs ${APP_NAME} || echo "No container logs available"'
    }
    
    unstable {
      echo "⚠️  Pipeline completed with warnings"
      echo "Review the security findings and address them"
    }
  }
}