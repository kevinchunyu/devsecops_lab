pipeline {
  agent any
  
  parameters {
    string(
      name: 'STUDENT_REPO_URL',
      defaultValue: 'https://github.com/kevinchunyu/devsecops_lab.git',
      description: 'Student GitHub repository URL'
    )
    string(
      name: 'BRANCH_NAME',
      defaultValue: 'main',
      description: 'Branch to test'
    )
    string(
      name: 'STUDENT_ID',
      defaultValue: 'student001',
      description: 'Student identifier'
    )
  }
  
  tools {
    nodejs 'Node 18'
  }
  
  environment {
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    APP_NAME = "test_app_${params.STUDENT_ID}_${BUILD_NUMBER}"
    IMAGE_TAG = "student_app:${params.STUDENT_ID}-${BUILD_NUMBER}"
    // Fixed: Convert BUILD_NUMBER to integer properly
    TEST_PORT = "${9100 + (BUILD_NUMBER.toInteger() % 50)}"
  }
  
  stages {
    stage('Checkout') {
      steps {
        git branch: "${params.BRANCH_NAME}", url: "${params.STUDENT_REPO_URL}"
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=$SONAR_TOKEN \
              -Dsonar.projectKey=devsecops_lab_${STUDENT_ID} \
              -Dsonar.projectName="DevSecOps Lab - ${STUDENT_ID}" \
              -Dsonar.projectVersion=${BUILD_NUMBER} \
              -Dsonar.sources=app \
              -Dsonar.exclusions="**/node_modules/**" \
              -Dsonar.javascript.file.suffixes=.js \
              -Dsonar.sourceEncoding=UTF-8
          '''
        }
      }
    }

    stage('Build App') {
      steps {
        sh '''
          docker build -t ${IMAGE_TAG} ./app
        '''
      }
    }

    stage('Run App') {
      steps {
        sh '''
          docker rm -f ${APP_NAME} 2>/dev/null || true
          
          docker run -d \
            --name ${APP_NAME} \
            -p ${TEST_PORT}:3009 \
            ${IMAGE_TAG}
          
          sleep 15
          
          if ! docker ps | grep -q ${APP_NAME}; then
            echo "Container failed to start"
            docker logs ${APP_NAME}
            exit 1
          fi
          
          echo "✅ App running on port ${TEST_PORT}"
        '''
      }
    }

    stage('Security Testing') {
      steps {
        sh '''
          TARGET_URL="http://localhost:${TEST_PORT}"
          
          echo "🔒 Running Security Tests..."
          echo "Target: $TARGET_URL"
          
          # Test 1: SQL Injection
          echo "🧪 Testing SQL Injection..."
          SQLI_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
            -d '{"username":"admin'\''OR'\''1'\''='\''1","password":"anything"}' \
            "$TARGET_URL/api/login" || echo '{"error":"request_failed"}')
          
          echo "SQL Injection Response: $SQLI_RESPONSE"
          
          if echo "$SQLI_RESPONSE" | grep -q "success"; then
            echo "🚨 VULNERABLE: SQL Injection bypass successful"
          else
            echo "✅ SECURE: SQL Injection blocked"
          fi
          
          # Test 2: XSS
          echo "🧪 Testing XSS..."
          XSS_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
            -d '{"username":"<script>alert('\''xss'\'')</script>","email":"test@test.com","password":"password123"}' \
            "$TARGET_URL/api/register" || echo '{"error":"request_failed"}')
          
          echo "XSS Response: $XSS_RESPONSE"
          
          if echo "$XSS_RESPONSE" | grep -q "<script>"; then
            echo "🚨 VULNERABLE: XSS payload reflected"
          else
            echo "✅ SECURE: XSS payload sanitized"
          fi
          
          # Test 3: Path Traversal
          echo "🧪 Testing Path Traversal..."
          TRAVERSAL_RESPONSE=$(curl -s "$TARGET_URL/api/download/../../app.js" || echo "request_failed")
          
          if echo "$TRAVERSAL_RESPONSE" | grep -q "express\\|require"; then
            echo "🚨 VULNERABLE: Path traversal successful"
          else
            echo "✅ SECURE: Path traversal blocked"
          fi
          
          echo "🔒 Security testing complete"
        '''
      }
    }

    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh '''
          TARGET_URL="http://localhost:${TEST_PORT}"
          
          echo "🕷️ Starting ZAP Baseline Scan..."
          
          docker run --rm \
            --network host \
            -v ${WORKSPACE}:/zap/wrk/:rw \
            zaproxy/zap-stable zap-baseline.py \
              -t ${TARGET_URL} \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json \
              || echo "ZAP scan completed"
        '''
      }
    }
  }

  post {
    always {
      // Fixed: Wrap shell commands in node context
      node {
        sh '''
          echo "🧹 Cleaning up..."
          docker stop ${APP_NAME} 2>/dev/null || true
          docker rm ${APP_NAME} 2>/dev/null || true
          docker rmi ${IMAGE_TAG} 2>/dev/null || true
        '''
      }
      
      archiveArtifacts artifacts: 'zap_baseline_report.*', allowEmptyArchive: true
    }
    
    success {
      echo '🎉 Pipeline completed successfully!'
    }
    
    failure {
      echo '❌ Pipeline failed. Check the logs above for details.'
    }
  }
}