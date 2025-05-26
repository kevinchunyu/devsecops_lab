pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_SONAR', defaultValue: true, description: 'Run SonarQube Static Analysis?')
    string(name: 'STUDENT_ID', defaultValue: 'student001', description: 'Enter your student ID (e.g., student001)')
  }

  environment {
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG    = "${params.STUDENT_ID}-${BUILD_ID}"
    APP_NAME     = "app_${params.STUDENT_ID}_${BUILD_ID}"
    DOCKER_NET   = "devsecops_net"
    STUDENT_PROJECT_KEY = "devsecops_lab_${params.STUDENT_ID}"
  }

  stages {
    stage('Environment Info') {
      steps {
        echo "=== DevSecOps Lab - ${params.STUDENT_ID} ==="
        echo "Build ID: ${BUILD_ID}"
        echo "SonarQube Analysis: ${params.RUN_SONAR}"
        
        sh '''
          echo "Docker version:"
          docker --version
        '''
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
        echo "✅ Source code checked out successfully"
      }
    }

    stage('Code Validation') {
      steps {
        script {
          if (!fileExists('app')) {
            error("❌ 'app' directory not found. Please ensure your application code is in the 'app' folder.")
          }
          
          if (!fileExists('app/package.json')) {
            echo "⚠️  No package.json found - this might not be a Node.js application"
          } else {
            echo "✅ Node.js application detected"
          }
          
          if (!fileExists('app/Dockerfile')) {
            error("❌ Dockerfile not found in app directory")
          } else {
            echo "✅ Dockerfile found"
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
              -Dsonar.exclusions=**/node_modules/**,**/test/**,**/tests/** \
              -Dsonar.javascript.file.suffixes=.js,.mjs \
              -Dsonar.inclusions=**/*.js,**/*.mjs,**/package.json \
              -Dsonar.sourceEncoding=UTF-8
          '''
        }
        echo "✅ SonarQube analysis completed"
        echo "📊 View results at: http://sonar.internal:9000/dashboard?id=${env.STUDENT_PROJECT_KEY}"
      }
    }

    stage('Build Docker Image') {
      steps {
        echo "🐳 Building Docker image..."
        dir('app') {
          sh '''
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
          
          echo "Container status:"
          docker ps | grep ${APP_NAME}
        '''
      }
    }

    stage('SQL Injection Security Tests') {
      steps {
        echo "🔒 Testing SQL Injection vulnerabilities..."
        
        sh '''
          echo "=== SQL INJECTION VULNERABILITY TEST ==="
          echo "Testing login endpoint: /api/login"
          echo ""
          
          # Test payloads for SQL injection
          PAYLOADS=(
            "admin'--"
            "admin' OR '1'='1"
            "' OR 'x'='x"
            "'; DROP TABLE users; --"
            "admin' UNION SELECT 1,2,3,4--"
          )
          
          VULNERABLE=false
          BYPASS_COUNT=0
          
          for payload in "${PAYLOADS[@]}"; do
            echo "🧪 Testing payload: $payload"
            
            RESPONSE=$(docker exec ${APP_NAME} curl -s -X POST http://localhost:3009/api/login \
              -H "Content-Type: application/json" \
              -d "{\"username\": \"$payload\", \"password\": \"test\"}" 2>/dev/null || echo "ERROR")
            
            echo "   Response: $RESPONSE"
            
            # Check if login was successful (indicating SQL injection)
            if [[ "$RESPONSE" == *"Login successful"* ]] || [[ "$RESPONSE" == *"welcome"* ]] || [[ "$RESPONSE" == *"user"* ]]; then
              echo "   🚨 VULNERABILITY DETECTED: SQL Injection successful!"
              VULNERABLE=true
              BYPASS_COUNT=$((BYPASS_COUNT + 1))
            else
              echo "   ✅ Payload blocked or failed"
            fi
            echo ""
          done
          
          echo "=== RESULTS SUMMARY ==="
          echo "Total payloads tested: ${#PAYLOADS[@]}"
          echo "Successful bypasses: $BYPASS_COUNT"
          
          if [ "$VULNERABLE" = true ]; then
            echo "🚨 SQL INJECTION VULNERABILITY CONFIRMED"
            echo "❌ Application is vulnerable to SQL injection attacks"
            echo "📋 Recommendation: Use parameterized queries instead of string concatenation"
            # Mark build as unstable but don't fail (educational purpose)
            echo "UNSTABLE" > sql_injection_result.txt
          else
            echo "✅ No SQL injection vulnerabilities detected"
            echo "PASSED" > sql_injection_result.txt
          fi
        '''
        
        script {
          def result = readFile('sql_injection_result.txt').trim()
          if (result == 'UNSTABLE') {
            currentBuild.result = 'UNSTABLE'
            echo "⚠️  Build marked as UNSTABLE due to security vulnerabilities"
          }
        }
      }
    }

    stage('Security Summary') {
      steps {
        echo "=== SECURITY ASSESSMENT SUMMARY ==="
        echo "Student: ${params.STUDENT_ID}"
        echo "Build: ${BUILD_ID}"
        echo "Timestamp: ${new Date()}"
        echo ""
        
        script {
          if (params.RUN_SONAR) {
            echo "📊 SonarQube Analysis: COMPLETED"
            echo "   🔗 Dashboard: http://sonar.internal:9000/dashboard?id=${env.STUDENT_PROJECT_KEY}"
            echo "   📋 Review code quality and security hotspots"
          }
          
          def sqlResult = readFile('sql_injection_result.txt').trim()
          if (sqlResult == 'UNSTABLE') {
            echo "🔒 SQL Injection Test: VULNERABILITIES FOUND"
            echo "   🚨 Action Required: Fix SQL injection vulnerabilities"
          } else {
            echo "🔒 SQL Injection Test: PASSED"
            echo "   ✅ No SQL injection vulnerabilities detected"
          }
        }
        
        echo ""
        echo "📝 NEXT STEPS:"
        echo "1. Review SonarQube dashboard for detailed findings"
        echo "2. Fix any SQL injection vulnerabilities in your code"
        echo "3. Use parameterized queries instead of string concatenation"
        echo "4. Re-run the pipeline to verify fixes"
        echo ""
        echo "🎯 Learning Objectives:"
        echo "- Understand how SQL injection attacks work"
        echo "- Learn to identify vulnerable code patterns"
        echo "- Practice secure coding techniques"
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
      
      // Archive test results
      archiveArtifacts artifacts: 'sql_injection_result.txt', allowEmptyArchive: true
      
      echo "📋 Build completed for ${params.STUDENT_ID}"
    }
    
    success {
      echo "🎉 Pipeline completed successfully!"
      echo ""
      echo "📚 REVIEW YOUR RESULTS:"
      echo "1. Check SonarQube dashboard for code analysis"
      echo "2. Review SQL injection test results above"
      echo "3. Implement security fixes as needed"
    }
    
    failure {
      echo "❌ Pipeline failed!"
      echo "Check the error logs above for details"
      sh 'docker logs ${APP_NAME} || echo "No container logs available"'
    }
    
    unstable {
      echo "⚠️  Pipeline completed with security issues found"
      echo "🔧 Please review and fix the identified vulnerabilities"
      echo "📖 This is a learning opportunity - analyze the findings!"
    }
  }
}